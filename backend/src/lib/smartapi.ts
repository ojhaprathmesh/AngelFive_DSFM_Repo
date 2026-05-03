/**
 * SmartAPI service
 */

import speakeasy from "speakeasy";

import { ENV } from "../config/env";

let jwtTokenCache: string | null = null;
let jwtTokenExpiry = 0;

/* ---------------------------------- */
/* TOTP Generator                     */
/* ---------------------------------- */

function generateTOTP(secret: string): string {
    return (speakeasy.totp as any)({ secret, encoding: "base32", window: 1 });
}

/* ---------------------------------- */
/* JWT TOKEN                          */
/* ---------------------------------- */

export async function getSmartApiJwtToken(): Promise<string | null> {
    // Use cached token (5 min buffer before expiry)
    if (jwtTokenCache && Date.now() < jwtTokenExpiry - 5 * 60 * 1000) {
        return jwtTokenCache;
    }

    try {
        const totp = generateTOTP(ENV.SMARTAPI_TOTP_SECRET);

        const response = await fetch(
            "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-PrivateKey": ENV.SMARTAPI_API_KEY,
                    Accept: "application/json",
                    "X-SourceID": "WEB",
                    "X-ClientLocalIP": ENV.SMARTAPI_LOCAL_IP,
                    "X-ClientPublicIP": ENV.SMARTAPI_PUBLIC_IP,
                    "X-MACAddress": ENV.SMARTAPI_MAC_ADDRESS,
                    "X-UserType": "USER",
                },
                body: JSON.stringify({
                    clientcode: ENV.SMARTAPI_CLIENT_CODE,
                    password: ENV.SMARTAPI_PASSWORD,
                    totp,
                }),
            },
        );

        if (!response.ok) return null;

        const data: any = await response.json();

        if (!data.status || !data.data?.jwtToken) {
            console.error("[SmartAPI] Login failed:", data.message, data.errorCode);
            return null;
        }

        jwtTokenCache = data.data.jwtToken;
        jwtTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

        return jwtTokenCache;
    } catch (error) {
        jwtTokenCache = null;
        jwtTokenExpiry = 0;
        console.error("SmartAPI login failed:", error);
        return null;
    }
}

/* ---------------------------------- */
/* Credential Check                   */
/* ---------------------------------- */

export function hasSmartApiCredentials(): boolean {
    return !!(
        ENV.SMARTAPI_API_KEY &&
        ENV.SMARTAPI_CLIENT_CODE &&
        ENV.SMARTAPI_PASSWORD &&
        ENV.SMARTAPI_TOTP_SECRET
    );
}

/* ---------------------------------- */
/* QUOTES                             */
/* ---------------------------------- */

export interface SmartApiQuoteItem {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    lastUpdated: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    totBuyQuan?: number;
    totSellQuan?: number;
}

let quoteFetchQueue = Promise.resolve();
const QUOTE_INTERVAL_MS = 105; // ~10 RPS

function queueQuoteFetch<T>(fn: () => Promise<T>): Promise<T> {
    const next = quoteFetchQueue.then(() => new Promise<void>(res => setTimeout(res, QUOTE_INTERVAL_MS)));
    quoteFetchQueue = next.catch(() => {});
    return next.then(() => fn());
}

export async function fetchSmartApiQuotes(
    exchangeTokens: Record<string, string[]>,
): Promise<SmartApiQuoteItem[]> {
    const jwt = await getSmartApiJwtToken();
    if (!jwt) return [];

    return queueQuoteFetch(async () => {
        try {
            const response = await fetch(
                "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        "X-PrivateKey": ENV.SMARTAPI_API_KEY,
                        "X-SourceID": "WEB",
                        "X-ClientLocalIP": ENV.SMARTAPI_LOCAL_IP,
                        "X-ClientPublicIP": ENV.SMARTAPI_PUBLIC_IP,
                        "X-MACAddress": ENV.SMARTAPI_MAC_ADDRESS,
                        "X-UserType": "USER",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        mode: "FULL",
                        exchangeTokens,
                    }),
                },
            );

        if (!response.ok) return [];

        const data: any = await response.json();
        if (!data.status || !data.data?.fetched) return [];

        return data.data.fetched.map((q: any) => ({
            symbol: q.tradingSymbol,
            price: q.ltp,
            change: q.netChange,
            changePercent: q.percentChange,
            lastUpdated: q.exchFeedTime,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.tradeVolume,
            totBuyQuan: q.totBuyQuan,
            totSellQuan: q.totSellQuan,
        }));
    } catch (error) {
        console.error("SmartAPI quote fetch failed:", error);
        return [];
    }
    });
}

/* ---------------------------------- */
/* CANDLES                            */
/* ---------------------------------- */

let candleFetchQueue = Promise.resolve();
const CANDLE_INTERVAL_MS = 350; // ~3 RPS

function queueCandleFetch<T>(fn: () => Promise<T>): Promise<T> {
    const next = candleFetchQueue.then(() => new Promise<void>(res => setTimeout(res, CANDLE_INTERVAL_MS)));
    candleFetchQueue = next.catch(() => {});
    return next.then(() => fn());
}

export async function fetchSmartApiCandles(
    exchange: string,
    symbolToken: string,
    interval: string,
    fromDate: string,
    toDate: string,
): Promise<Array<[string, number, number, number, number, number]>> {
    const jwt = await getSmartApiJwtToken();
    if (!jwt) return [];

    return queueCandleFetch(async () => {
        try {
            const response = await fetch(
                "https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        "X-PrivateKey": ENV.SMARTAPI_API_KEY,
                        "X-SourceID": "WEB",
                        "X-ClientLocalIP": ENV.SMARTAPI_LOCAL_IP,
                        "X-ClientPublicIP": ENV.SMARTAPI_PUBLIC_IP,
                        "X-MACAddress": ENV.SMARTAPI_MAC_ADDRESS,
                        "X-UserType": "USER",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        // SmartAPI expects these exact field names (per Historical API docs):
                        // exchange, symboltoken, interval, fromdate, todate
                        exchange,
                        symboltoken: symbolToken,
                        interval,
                        fromdate: fromDate,
                        todate: toDate,
                    }),
                },
            );

        if (!response.ok) {
            const errText = await response.text().catch(() => "");
            console.error(
                "[SmartAPI] Candle fetch HTTP error:",
                response.status,
                response.statusText,
                errText.slice(0, 500),
            );
            return [];
        }

        const data: any = await response.json();
        if (!data.status || !Array.isArray(data.data)) {
            console.error(
                "[SmartAPI] Candle fetch returned invalid payload:",
                JSON.stringify(
                    { status: data?.status, message: data?.message, errorCode: data?.errorCode },
                    null,
                    2,
                ),
            );
            return [];
        }

        return data.data;
    } catch (error) {
        console.error("SmartAPI candle fetch failed:", error);
        return [];
    }
    });
}

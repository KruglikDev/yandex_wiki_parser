import * as fs from 'fs/promises';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

type Proxy = {
    url: string;
    failedAttempts: number;
};

type ProxyManager = {
    getProxyWithRetry: () => Promise<string | null>;
};

// Расширяем RequestInit для поддержки agent
declare global {
    interface RequestInit {
        agent?: HttpsProxyAgent<string> | SocksProxyAgent;
    }
}

export async function createProxyManager(proxyFilePath = './proxies.txt'): Promise<ProxyManager> {
    let proxies: Proxy[] = [];

    try {
        const raw = await fs.readFile(proxyFilePath, 'utf-8');
        proxies = raw
            .split('\n')
            .map(p => p.trim())
            .filter(Boolean)
            .map(p => ({ url: p, failedAttempts: 0 }));
    } catch (error) {
        console.error(`[PROXY] Failed to load proxies file: ${error instanceof Error ? error.message : String(error)}`);
        return {
            getProxyWithRetry: () => Promise.resolve(null)
        };
    }

    const blacklist = new Set<string>();
    const testUrl = 'https://www.httpbin.org/ip';

    function getAgent(proxyUrl: string): HttpsProxyAgent<string> | SocksProxyAgent {
        return proxyUrl.startsWith('socks')
            ? new SocksProxyAgent(proxyUrl)
            : new HttpsProxyAgent<string>(proxyUrl);
    }

    async function validateProxy(proxyUrl: string): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(testUrl, {
                agent: getAgent(proxyUrl),
                signal: controller.signal,
            });

            clearTimeout(timeout);
            return response.ok;
        } catch (error) {
            console.debug(`[PROXY] Validation failed for ${proxyUrl}: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    async function getWorkingProxy(): Promise<string | null> {
        while (proxies.length > 0) {
            const idx = Math.floor(Math.random() * proxies.length);
            const proxy = proxies[idx];

            if (blacklist.has(proxy.url)) {
                proxies.splice(idx, 1);
                continue;
            }

            const isValid = await validateProxy(proxy.url);
            if (isValid) return proxy.url;

            proxy.failedAttempts++;

            if (proxy.failedAttempts >= 3) {
                console.warn(`[PROXY] Blacklisting: ${proxy.url}`);
                blacklist.add(proxy.url);
                proxies.splice(idx, 1);
            }
        }

        console.error(`[PROXY] No working proxies left`);
        return null;
    }

    return {
        async getProxyWithRetry(): Promise<string | null> {
            for (let attempt = 1; attempt <= 3; attempt++) {
                const proxy = await getWorkingProxy();
                if (proxy) return proxy;
            }
            return null;
        }
    };
}
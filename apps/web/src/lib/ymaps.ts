declare global {
  interface Window {
    ymaps?: any;
  }
}

let ymapsPromise: Promise<any> | null = null;

export function loadYmaps(apiKey?: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));

  if (window.ymaps) return Promise.resolve(window.ymaps);

  if (ymapsPromise) return ymapsPromise;

  ymapsPromise = new Promise((resolve, reject) => {
    const key = apiKey ?? process.env.NEXT_PUBLIC_YMAPS_KEY;
    if (!key) {
      reject(new Error("NEXT_PUBLIC_YMAPS_KEY is missing"));
      return;
    }

    // Если скрипт уже есть в DOM
    const existing = document.querySelector<HTMLScriptElement>('script[data-ymaps="true"]');
    if (existing) {
      existing.addEventListener("load", () => {
        if (!window.ymaps) return reject(new Error("ymaps not available after load"));
        window.ymaps.ready(() => resolve(window.ymaps));
      });
      existing.addEventListener("error", () => reject(new Error("failed to load ymaps script")));
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.ymaps = "true";
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
      key
    )}&lang=ru_RU`;

    script.onload = () => {
      if (!window.ymaps) return reject(new Error("ymaps not available after load"));
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error("failed to load ymaps script"));

    document.head.appendChild(script);
  });

  return ymapsPromise;
}

import { ContentType } from "../../../core/source-manager";
import { autoFetch } from "../../../http-client";

export type MangaEntry = {
  title: string;
  path: string;
  cover?: string;
  description?: string;
};

export abstract class MangaSource {
  abstract name: string;
  abstract icon: string;

  abstract mirrors: string[];
  abstract contentType: ContentType;
  activeMirror: string = "";

  private initPromise?: Promise<string>;

  private async pingMirror(mirror: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      let response = await autoFetch(mirror, {
        method: "HEAD",
        signal: controller.signal,
      });

      if (!response.ok && response.status !== 404) {
        response = await autoFetch(mirror, {
          method: "GET",
          signal: controller.signal,
        });
      }

      if (response.ok) {
        return mirror;
      }
      throw new Error(`Mirror returned status ${response.status}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private findActiveMirror(): Promise<string> {
    if (!this.mirrors || this.mirrors.length === 0) {
      console.warn("No mirrors defined for source:", this.name);
      return Promise.resolve("");
    }

    const requests = this.mirrors.map((mirror) => this.pingMirror(mirror));

    return Promise.any(requests)
      .then((firstWorkingMirror) => {
        this.activeMirror = firstWorkingMirror;
        return firstWorkingMirror;
      })
      .catch(() => {
        console.warn("No active mirror found for:", this.name);
        return "";
      });
  }

  protected async ensureActiveMirror(): Promise<string> {
    if (this.activeMirror) {
      return this.activeMirror;
    }

    if (!this.initPromise) {
      this.initPromise = this.findActiveMirror();
    }

    return this.initPromise;
  }

  abstract search(
    query: string,
    page: number,
    sort: "views" | "rating" | undefined,
    status: "all" | "ongoing" | "completed",
  ): Promise<MangaEntry[]>;
}

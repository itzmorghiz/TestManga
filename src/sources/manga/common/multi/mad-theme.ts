import buildUrl from "build-url-ts";
import { MangaSource, type MangaEntry } from "../base";
import { autoFetch } from "../../../../http-client";
import * as cheerio from "cheerio";

export default abstract class MadThemeCommon extends MangaSource {
  async search(
    query: string,
    page: number,
    _sort: "views" | "rating" | undefined,
    status: "all" | "ongoing" | "completed",
  ) {
    const base = await this.ensureActiveMirror();
    const url = buildUrl(base, { path: "search", queryParams: { query, page, status } });

	console.log(url)

    const response = await autoFetch(url);

    const $ = cheerio.load(await response.text());

    const entries = $(".book-detailed-item")
      .map((_, el) => {
        const $el = $(el);

        const link = $el.find("a").first();
        const path = link.attr("href");
        const title = link.attr("title");

        const description = $el.find(".summary").text().trim();

        /*const genres = $el
          .find(".genres > *")
          .map((_, g) => $(g).text().trim())
          .get();
*/
        const cover = $el.find("img").first().attr("data-src");

        return { title, path, description, cover } as MangaEntry;
      })
      .get();

	  return entries
  }
}

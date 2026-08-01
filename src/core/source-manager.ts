import type { MangaSource } from "../sources/manga/common/base";

export enum ContentType {
	SFW,
	NSFW,
	Mixed,
}

export async function loadMangaSource(url: string): Promise<MangaSource> {
  const module = await (0, eval)(`import("${url}")`);
  const SourceClass = module.default;

  if (!SourceClass) {
    throw new Error(`Il file in "${url}" non possiede un export default.`);
  }

  return new SourceClass() as MangaSource;
}
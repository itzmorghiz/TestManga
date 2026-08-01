import { defineConfig } from "vite";
import { resolve, relative } from "path";
import glob from "fast-glob";

const extensionEntries = glob.sync("src/sources/**/*.ts", {
	ignore: ["**/common/**"],
});

const inputMap = Object.fromEntries(
  extensionEntries.map((file) => {
		const relativePath = relative("src/sources", file);
		const entryName = relativePath.replace(/\.ts$/, "");
		return [entryName, resolve(import.meta.dirname, file)];
	}),
);

export default defineConfig(({ command, mode }) => {
	const isWatch =
		process.argv.includes("--watch") && !process.argv.includes("--watch=false");

	return {
		publicDir: false,
		build: {
			outDir: "public/sources",
			emptyOutDir: !isWatch,
			lib: {
				entry: inputMap,
				formats: ["es"],
				fileName: (_, entryName) => `${entryName}.js`,
			},
			rollupOptions: {
				output: {
					minifyInternalExports: false,
				},
			},
		},
		base: "./"
	};
});

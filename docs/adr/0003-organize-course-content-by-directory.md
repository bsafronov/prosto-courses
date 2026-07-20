# Organize course content by directory

Each course is a self-contained directory whose name is its stable slug, with an `index.mdx` Course Overview and a `lessons/` directory whose filenames are stable Lesson slugs. Course frontmatter requires only `title`, `summary`, and `outcomes`; Lesson frontmatter requires `title` and a unique, contiguous `order` starting at 1. This structure makes Course ownership visible and keeps adding or reordering a Lesson local to that file, avoiding repeated course references, numeric filenames, and a central lesson manifest.

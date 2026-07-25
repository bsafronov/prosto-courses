function visit(node) {
  if (
    node?.type === "element" &&
    node.tagName === "a" &&
    /^https?:\/\//.test(String(node.properties?.href ?? ""))
  ) {
    node.properties = {
      ...node.properties,
      "data-external-reference": "",
      className: [
        ...(Array.isArray(node.properties?.className)
          ? node.properties.className
          : []),
        "external-reference",
      ],
      rel: ["noopener", "noreferrer"],
      target: "_blank",
    };
    node.children.push(
      { type: "text", value: " " },
      {
        type: "element",
        tagName: "span",
        properties: {
          className: ["external-reference-badge"],
        },
        children: [{ type: "text", value: "↗ требуется интернет" }],
      },
    );
  }

  for (const child of node?.children ?? []) visit(child);
}

export function externalReferences() {
  return visit;
}

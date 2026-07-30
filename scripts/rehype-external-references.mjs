function isExternalReference(href, platformRoot) {
  if (!/^(?:https?:)?\/\//i.test(String(href ?? ""))) return false;

  try {
    const url = new URL(String(href), platformRoot);
    const platformScope =
      platformRoot.pathname === "/"
        ? "/"
        : `${platformRoot.pathname.replace(/\/+$/, "")}/`;
    const isInternalPlatformLink =
      url.origin === platformRoot.origin &&
      (url.pathname === platformRoot.pathname ||
        url.pathname.startsWith(platformScope));
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !isInternalPlatformLink
    );
  } catch {
    return false;
  }
}

function visit(node, platformRoot) {
  if (
    node?.type === "element" &&
    node.tagName === "a" &&
    isExternalReference(node.properties?.href, platformRoot)
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
    node.children.push({
      type: "element",
      tagName: "sup",
      properties: {
        "aria-hidden": "true",
        className: ["external-reference-marker"],
      },
      children: [{ type: "text", value: "↗" }],
    });
  }

  for (const child of node?.children ?? []) visit(child, platformRoot);
}

export function externalReferences({ siteBasePath, siteOrigin }) {
  const platformRoot = new URL(siteBasePath, siteOrigin);
  return (tree) => visit(tree, platformRoot);
}

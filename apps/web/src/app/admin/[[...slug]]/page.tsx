import { redirect } from "next/navigation";

function toManagerPath(slug: string[] | undefined) {
  if (!slug || slug.length === 0) return "/manager";
  return `/manager/${slug.join("/")}`;
}

export default async function AdminAliasPage(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params;
  redirect(toManagerPath(slug));
}

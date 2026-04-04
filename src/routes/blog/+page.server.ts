export const load = async () => {
  const modules = import.meta.glob("/src/posts/*.svx", { eager: true });

  const posts = Object.entries(modules).map(([path, mod]) => {
    const slug = path.split("/").at(-1)!.replace(".svx", "");
    const { title, date, description } = (mod as any).metadata;
    return { slug, title, date, description };
  });

  return {
    posts: posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  };
};

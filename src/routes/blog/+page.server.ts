export const load = async () => {
  const modules = import.meta.glob("/src/posts/*.svx", { eager: true });

  interface PostModule {
    metadata: { title: string; date: string; description: string };
  }

  const posts = Object.entries(modules).map(([path, mod]) => {
    const { title, date, description } = (mod as PostModule).metadata;
    const slug = path.split("/").at(-1)!.replace(".svx", "");
    return { slug, title, date, description };
  });

  return {
    posts: posts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  };
};

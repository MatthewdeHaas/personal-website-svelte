export const ssr = false;

export const load = async ({ params }) => {
  const post = await import(`../../../posts/${params.slug}.svx`);
  return {
    content: post.default,
    meta: post.metadata,
  };
};

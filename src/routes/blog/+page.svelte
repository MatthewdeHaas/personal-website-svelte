<script lang="ts">
  let { data } = $props();

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
</script>

<div class="max-w-2xl mx-auto">
  <div
    class="border-b border-stone-900 mb-8 pb-2 flex items-baseline justify-between"
  >
    <h2 class="font-display text-3xl font-bold text-stone-900">The Blog</h2>
    <span class="font-serif text-xs tracking-[0.15em] uppercase text-stone-400">
      {data.posts.length}
      {data.posts.length === 1 ? "entry" : "entries"}
    </span>
  </div>

  <div class="divide-y divide-stone-200">
    {#each data.posts as post (post.slug)}
      <a href="/blog/{post.slug}" class="block group py-6 no-underline">
        <div class="flex items-baseline justify-between gap-4 mb-1">
          <h3
            class="font-display text-xl font-bold text-stone-900 group-hover:underline underline-offset-2 decoration-1 leading-snug"
          >
            {post.title}
          </h3>
          <time
            class="font-serif text-xs tracking-widest uppercase text-stone-400 shrink-0"
          >
            {formatDate(post.date)}
          </time>
        </div>
        <p class="font-serif text-base text-stone-600 leading-relaxed">
          {post.description}
        </p>
      </a>
    {/each}
  </div>
</div>

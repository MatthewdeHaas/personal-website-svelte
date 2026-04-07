<script lang="ts">
  let { data } = $props();
  const isDev = import.meta.env.DEV;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return new Date(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };
</script>

<div class="max-w-2xl mx-auto">
  {#if data.meta.published || isDev}
    <div class="border-b border-stone-900 mb-8 pb-4">
      <h1
        class="font-display text-4xl font-bold text-stone-900 leading-tight mb-2"
      >
        {data.meta.title}
      </h1>
      <time class="font-serif text-sm tracking-widest uppercase text-stone-400">
        {formatDate(data.meta.date)}
      </time>
    </div>

    <div class="prose prose-stone max-w-none">
      <data.content />
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <h1 class="text-3xl font-bold text-stone-900 mb-2">Coming Soon</h1>
      <p class="text-stone-500 max-w-md mb-6">
        I'm still writing this article. It’ll be published once it's ready.
      </p>
    </div>
  {/if}
</div>

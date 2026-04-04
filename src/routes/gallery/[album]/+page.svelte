<script lang="ts">
  import type { Album, Asset } from "$lib/server/gallery";

  let { data }: { data: { album: Album; assets: Asset[] } } = $props();

  let filter = $state<"photo" | "video" | "all">("all");

  let filtered = $derived(
    filter === "all"
      ? data.assets
      : data.assets.filter((a) => a.type === filter),
  );

  const hasPhotos = data.assets.some((a) => a.type === "photo");
  const hasVideos = data.assets.some((a) => a.type === "video");
</script>

<div class="max-w-2xl mx-auto">
  <!-- Header -->
  <div class="border-b border-stone-900 mb-6 pb-2">
    <a
      href="/gallery"
      class="font-serif text-xs tracking-[0.2em] uppercase text-stone-400 hover:text-stone-900 transition-colors no-underline"
    >
      ← Gallery
    </a>
    <div class="flex items-baseline justify-between mt-2">
      <h2 class="font-display text-3xl font-bold text-stone-900">
        {data.title}
      </h2>
      <span class="font-serif text-xs tracking-widest uppercase text-stone-400"
        >{data.year}</span
      >
    </div>
    <p class="font-serif text-sm text-stone-500 mt-1">
      {data.description}
    </p>
  </div>

  <!-- Filter toggle -->
  {#if hasPhotos && hasVideos}
    <div class="flex gap-4 mb-6">
      {#each ["all", "photo", "video"] as const as option (option)}
        <button
          onclick={() => (filter = option)}
          class="font-serif text-xs tracking-[0.2em] uppercase pb-0.5 transition-colors
            {filter === option
            ? 'text-stone-900 border-b border-stone-900'
            : 'text-stone-400 hover:text-stone-600'}"
        >
          {option === "all" ? "All" : option === "photo" ? "Photos" : "Videos"}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Masonry grid -->
  <div class="columns-2 sm:columns-3 gap-3">
    {#each filtered as asset (asset.id)}
      <div class="break-inside-avoid mb-3 group relative">
        {#if asset.type === "photo"}
          <img
            src={asset.url}
            alt={asset.caption ?? ""}
            class="w-full block transition-all duration-300"
          />
        {:else}
          <video
            src={asset.url}
            class="w-full block"
            controls
            preload="metadata"
            onplay={() => fetch(`/api/views/${asset.id}`, { method: "POST" })}
          ></video>
        {/if}

        {#if asset.caption}
          <p class="font-serif text-xs text-stone-400 italic mt-1 leading-snug">
            {asset.caption}
          </p>
        {/if}
      </div>
    {/each}
  </div>
</div>

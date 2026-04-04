<script lang="ts">
  import type { Album } from "$lib/server/gallery";

  let { data }: { data: { albums: Album[] } } = $props();
</script>

<div class="max-w-2xl mx-auto">
  <div
    class="border-b border-stone-900 mb-8 pb-2 flex items-baseline justify-between"
  >
    <h2 class="font-display text-3xl font-bold text-stone-900">Gallery</h2>
    <span class="font-serif text-xs tracking-[0.15em] uppercase text-stone-400">
      {data.albums.length}
      {data.albums.length === 1 ? "album" : "albums"}
    </span>
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
    {#each data.albums as album (album.slug)}
      <a href="/gallery/{album.slug}" class="group block no-underline">
        <div class="aspect-square overflow-hidden mb-2">
          <img
            src={album.cover_url}
            alt={album.title}
            class="w-full h-full object-cover transition-all duration-300"
          />
        </div>
        <div class="flex items-baseline justify-between gap-2">
          <span
            class="font-display text-sm font-bold text-stone-900 group-hover:underline underline-offset-2 decoration-1 leading-snug"
          >
            {album.title}
          </span>
          <span
            class="font-serif text-xs tracking-widest uppercase text-stone-400 shrink-0"
          >
            {album.year}
          </span>
        </div>
        <p class="font-serif text-xs text-stone-500 leading-relaxed mt-0.5">
          {album.description}
        </p>
      </a>
    {/each}
  </div>
</div>

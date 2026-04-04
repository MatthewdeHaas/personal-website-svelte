<script lang="ts">
  import type { Project } from "./+page.server.ts";

  let { data }: { data: { projects: Project[] } } = $props();
</script>

<div class="max-w-2xl mx-auto">
  <div
    class="border-b border-stone-900 mb-8 pb-2 flex items-baseline justify-between"
  >
    <h2 class="font-display text-3xl font-bold text-stone-900">Projects</h2>
    <span class="font-serif text-xs tracking-[0.15em] uppercase text-stone-400">
      {data.projects.length}
      {data.projects.length === 1 ? "project" : "projects"}
    </span>
  </div>

  <div class="divide-y divide-stone-200">
    {#each data.projects as project (project.title)}
      <article class="py-8">
        <div class="flex gap-8">
          {#if project.image}
            <img
              src={project.image}
              alt={project.title}
              class="w-32 h-24 object-cover shrink-0 grayscale"
            />
          {/if}

          <div class="flex flex-col gap-3 flex-1">
            <div class="flex items-baseline justify-between gap-4">
              <h3
                class="font-display text-xl font-bold text-stone-900 leading-snug"
              >
                {project.title}
              </h3>
              <span
                class="font-serif text-xs tracking-widest uppercase text-stone-400 shrink-0"
              >
                {project.year}
              </span>
            </div>

            <p class="font-serif text-base text-stone-600 leading-relaxed">
              {project.description}
            </p>

            <div class="flex items-center gap-6 flex-wrap">
              <div class="flex gap-2 flex-wrap">
                {#each project.tags as tag (tag)}
                  <span
                    class="font-serif text-xs tracking-widest uppercase text-stone-400 border border-stone-300 px-2 py-0.5"
                  >
                    {tag}
                  </span>
                {/each}
              </div>

              {#if project.links}
                <div class="flex gap-4 ml-auto">
                  {#each project.links as link (link.href)}
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-serif text-xs tracking-widest uppercase text-stone-900 underline underline-offset-2 decoration-1 hover:text-stone-500 transition-colors"
                    >
                      {link.label}
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      </article>
    {/each}
  </div>
</div>

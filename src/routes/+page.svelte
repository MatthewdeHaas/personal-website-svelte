<script lang="ts">
  import profile from "$lib/assets/lying-down.jpg";

  const socials = [
    { label: "GitHub", href: "https://github.com/MatthewdeHaas" },
    { label: "LinkedIn", href: "https://linkedin.com/in/matthewdehaas" },
    { label: "Instagram", href: "https://instagram.com/matthew.dehaas" },
  ];
</script>

<div class="max-w-2xl mx-auto">
  <!-- Lead -->
  <div class="flex flex-col sm:flex-row gap-8 mb-10">
    <div class="shrink-0">
      <img
        src={profile}
        alt="Matthew de Haas"
        class="w-36 h-36 object-cover sm:w-40 sm:h-40"
      />
    </div>

    <div
      class="flex flex-col gap-4 font-serif text-base text-stone-700 leading-relaxed"
    >
      <p>
        I am a fourth-year Mathematics student at the University of British
        Columbia, and an incoming intern at SAP. I build software that sits at
        the intersection of systems thinking and product craft, from blockchain
        infrastructure to full-stack web applications.
      </p>

      <p>
        My work history spans freelance software development, academic research,
        and open-source projects. Most recently I have been building Gambit, a
        peer-to-peer prediction market on Ethereum, and a platform overhaul for
        a food service client.
      </p>

      <p>
        Outside of software I am drawn to long-distance running, mathematics,
        and anything that rewards sustained attention, econometrics, trail
        navigation, the mechanics of a well-made espresso.
      </p>
    </div>
  </div>

  <!-- Divider -->
  <div
    class="border-t border-b border-stone-900 py-3 flex justify-center gap-8"
  >
    {#each socials as social (social.label)}
      <a
        href={social.href}
        target="_blank"
        rel="noopener noreferrer"
        class="font-serif text-xs tracking-[0.2em] uppercase text-stone-900 hover:text-stone-400 transition-colors duration-200"
      >
        {social.label}
      </a>
    {/each}
  </div>
</div>

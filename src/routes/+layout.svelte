<script lang="ts">
  import "@fontsource/playfair-display/400.css";
  import "@fontsource/playfair-display/700.css";
  import "@fontsource/cormorant-garamond/400.css";
  import "@fontsource/cormorant-garamond/600.css";
  import Navbar from "$lib/components/Navbar.svelte";
  import "./layout.css";

  let { children } = $props();
</script>

<div class="page-wrapper">
  <Navbar />
  <main>
    {@render children()}
  </main>
</div>

<style>
  .page-wrapper {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  main {
    min-height: 80vh;
  }
</style>

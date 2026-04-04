<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import "@fontsource/playfair-display/400.css";
  import "@fontsource/playfair-display/700.css";
  import "@fontsource/cormorant-garamond/400.css";
  import "@fontsource/cormorant-garamond/600.css";

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

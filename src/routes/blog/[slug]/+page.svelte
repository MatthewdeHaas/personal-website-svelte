<script lang="ts">
  let { data } = $props();
</script>

<h1>{data.meta.title}</h1>
<p>{data.meta.date}</p>

<div class="prose">
  <svelte:component this={data.content} />
</div>

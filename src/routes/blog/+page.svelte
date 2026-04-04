<script lang="ts">
  let { data } = $props();
</script>

{#each data.posts as post}
  <a href="/blog/{post.slug}">
    <h2>{post.title}</h2>
    <p>{post.date}</p>
    <p>{post.description}</p>
  </a>
{/each}

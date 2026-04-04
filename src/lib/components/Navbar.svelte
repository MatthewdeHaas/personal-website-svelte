<script lang="ts">
  import { page } from "$app/stores";

  const links = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/project", label: "Projects" },
    { href: "/gallery", label: "Gallery" },
  ];
</script>

<header class="navbar">
  <div class="masthead">
    <span class="date"
      >{new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</span
    >
    <h1 class="name">Matthew de Haas</h1>
  </div>
  <nav>
    {#each links as link (link.href)}
      <a href={link.href} class:active={$page.url.pathname === link.href}>
        {link.label}
      </a>
    {/each}
  </nav>
</header>

<style>
  .navbar {
    width: 100%;
    padding: 2rem 0 0;
    border-bottom: 3px double #1a1a1a;
    margin-bottom: 3rem;
  }

  .masthead {
    display: flex;
    flex-direction: column;
    align-items: center;
    border-bottom: 1px solid #1a1a1a;
    padding-bottom: 1rem;
    margin-bottom: 0;
    gap: 0.25rem;
  }

  .date {
    font-family: "Cormorant Garamond", serif;
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #555;
  }

  .name {
    font-family: "Playfair Display", serif;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-align: center;
    margin: 0;
    line-height: 1;
    color: #1a1a1a;
  }

  nav {
    display: flex;
    justify-content: center;
    gap: 2.5rem;
    padding: 0.75rem 0;
  }

  nav a {
    font-family: "Cormorant Garamond", serif;
    font-size: 0.8rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    text-decoration: none;
    color: #1a1a1a;
    position: relative;
    padding-bottom: 2px;
    transition: color 0.2s ease;
  }

  nav a::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 1px;
    background: #1a1a1a;
    transition: width 0.2s ease;
  }

  nav a:hover::after,
  nav a.active::after {
    width: 100%;
  }

  nav a.active {
    color: #1a1a1a;
  }
</style>

// Project details loader & interactive gallery
(function () {
    let currentProject = null;
    let galleryList = [];
    let currentLightboxIndex = 0;

    async function loadProjectData() {
        let projects = [];
        try {
            const response = await fetch("projects.json");
            if (response.ok) {
                projects = await response.json();
            } else {
                throw new Error("HTTP " + response.status);
            }
        } catch (err) {
            console.log("Using preloaded offline project data:", err);
            projects = window.PORTFOLIO_PROJECTS || [];
        }
        return projects;
    }

    async function initProject() {
        const container = document.getElementById("project");
        if (!container) return;

        try {
            const projects = await loadProjectData();
            if (!projects || projects.length === 0) {
                throw new Error("No projects found");
            }

            // Extract project id from URL query: ?id=1
            const urlParams = new URLSearchParams(window.location.search);
            const rawId = urlParams.get("id") || "1";

            // Find current project or default to first
            let pIndex = projects.findIndex(x => String(x.id) === String(rawId));
            if (pIndex === -1) pIndex = 0;

            const p = projects[pIndex];
            currentProject = p;

            // Compute previous and next projects
            const prevIndex = (pIndex - 1 + projects.length) % projects.length;
            const nextIndex = (pIndex + 1) % projects.length;
            const prevP = projects[prevIndex];
            const nextP = projects[nextIndex];

            // Update page title
            const projectTitle = p.title || p.name || `Project ${p.id}`;
            document.title = `${projectTitle} — Yasmin Graphic Designer`;

            // Prepare tools chips
            const tools = p.tools || ["Photoshop", "Illustrator"];
            const toolsHTML = tools
                .map(tool => `<span>${tool}</span>`)
                .join("");

            // Normalize cover image
            const coverImg = p.cover || p.image || (p.gallery && p.gallery[0]);
            const coverFilename = (coverImg || "").split("/").pop().toLowerCase();

            // Filter gallery to EXCLUDE the cover image (never repeat cover in gallery below)
            const allImages = p.gallery || p.images || [];
            const galleryItems = allImages.filter(img => {
                if (!img) return false;
                const imgFilename = img.split("/").pop().toLowerCase();
                return img !== coverImg && imgFilename !== coverFilename;
            });

            // Master list for full Lightbox viewing (cover at 0, then other images)
            galleryList = [coverImg, ...galleryItems];

            // Generate gallery HTML (only other images, no duplicate cover)
            const galleryImagesHTML = galleryItems.length > 0
                ? galleryItems.map((imgSrc, idx) => `
                    <div class="gallery-item" data-index="${idx + 1}" tabindex="0" role="button" aria-label="View visual ${idx + 2} full screen">
                        <img 
                            src="${imgSrc}" 
                            alt="${projectTitle} visual ${idx + 2}"
                            loading="lazy"
                            onerror="this.parentElement.classList.add('empty')"
                        >
                        <div class="gallery-overlay">
                            <span class="gallery-zoom-icon">⤢ View</span>
                        </div>
                    </div>
                `).join("")
                : `<p style="color: #667e91; font-size: 15px; grid-column: 1/-1;">All visuals are showcased above in the featured presentation.</p>`;

            // Inject content
            container.innerHTML = `
                <section class="project-hero">
                    <div class="project-info">
                        <p class="eyebrow orange">
                            ${p.category || "Graphic Design"} ✦
                        </p>
                        <h1>${projectTitle}</h1>
                        <p class="project-description">
                            ${p.description || p.desc || "A complete visual concept exploring composition, typography, visual hierarchy and consistent brand personality."}
                        </p>
                        <div class="chips">
                            ${toolsHTML}
                        </div>
                    </div>

                    <div class="project-cover" data-index="0" role="button" tabindex="0" aria-label="View cover image full screen">
                        <img 
                            src="${coverImg}" 
                            alt="${projectTitle} cover visual"
                        >
                        <div class="cover-overlay">
                            <span>⤢ Click to enlarge</span>
                        </div>
                    </div>
                </section>

                <section class="project-body">
                    <div>
                        <h2>THE IDEA</h2>
                        <p>
                            This project was structured around an intentional visual
                            direction—balancing expressive typography, compositional clarity,
                            dynamic visual hierarchy, and an authentic graphic presence.
                        </p>
                    </div>

                    <div>
                        <h2>MY ROLE</h2>
                        <p>
                            Art direction, concept development, identity architecture,
                            color palette curation, typography pairing, and final multi-asset execution.
                        </p>
                    </div>
                </section>

                <section class="project-gallery">
                    <div class="gallery-heading">
                        <p class="eyebrow orange">PROJECT VISUALS</p>
                        <h2>THE WORK (${galleryItems.length} more)</h2>
                    </div>

                    <div class="project-gallery-grid">
                        ${galleryImagesHTML}
                    </div>
                </section>

                <!-- Project Bottom Navigation -->
                <nav class="project-pagination" aria-label="Project pagination">
                    <a href="project.html?id=${prevP.id}" class="pagination-btn prev">
                        <span class="pagination-arrow">←</span>
                        <div>
                            <small>PREVIOUS PROJECT</small>
                            <strong>${prevP.title || prevP.name}</strong>
                        </div>
                    </a>

                    <a href="projects.html" class="pagination-grid-btn" aria-label="Back to all projects">
                        <span>☷</span>
                        <small>ALL PROJECTS</small>
                    </a>

                    <a href="project.html?id=${nextP.id}" class="pagination-btn next">
                        <div>
                            <small>NEXT PROJECT</small>
                            <strong>${nextP.title || nextP.name}</strong>
                        </div>
                        <span class="pagination-arrow">→</span>
                    </a>
                </nav>
            `;

            // Setup Lightbox triggers
            setupLightboxTriggers();

        } catch (error) {
            console.error("Error loading project details:", error);
            container.innerHTML = `
                <div class="project-error">
                    <h2>Oops! Project couldn't be loaded.</h2>
                    <p>
                        We couldn't retrieve the project details. Please check the project link or return to the projects archive.
                    </p>
                    <a href="projects.html" class="pill-btn" style="margin-top: 20px;">
                        ← View All Projects
                    </a>
                </div>
            `;
        }
    }

    // Lightbox Functionality
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    const lightboxCaption = document.getElementById("lightboxCaption");
    const lightboxClose = document.querySelector(".lightbox-close");
    const lightboxPrev = document.querySelector(".lightbox-prev");
    const lightboxNext = document.querySelector(".lightbox-next");

    function openLightbox(index) {
        if (!lightbox || !lightboxImg || galleryList.length === 0) return;
        currentLightboxIndex = (index + galleryList.length) % galleryList.length;
        updateLightboxView();
        lightbox.classList.add("open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove("open");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.classList.remove("lightbox-open");
    }

    function updateLightboxView() {
        const src = galleryList[currentLightboxIndex];
        lightboxImg.src = src;
        const projectTitle = currentProject ? (currentProject.title || currentProject.name) : "Project";
        lightboxCaption.textContent = `${projectTitle} — Visual ${currentLightboxIndex + 1} of ${galleryList.length}`;
    }

    function nextLightbox() {
        currentLightboxIndex = (currentLightboxIndex + 1) % galleryList.length;
        updateLightboxView();
    }

    function prevLightbox() {
        currentLightboxIndex = (currentLightboxIndex - 1 + galleryList.length) % galleryList.length;
        updateLightboxView();
    }

    function setupLightboxTriggers() {
        document.querySelectorAll(".gallery-item").forEach(item => {
            const idx = parseInt(item.dataset.index, 10) || 0;
            item.addEventListener("click", () => openLightbox(idx));
            item.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLightbox(idx);
                }
            });
        });

        const cover = document.querySelector(".project-cover");
        if (cover) {
            cover.addEventListener("click", () => openLightbox(0));
            cover.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLightbox(0);
                }
            });
        }
    }

    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxNext) lightboxNext.addEventListener("click", nextLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", prevLightbox);

    document.querySelector(".lightbox-backdrop")?.addEventListener("click", closeLightbox);

    document.addEventListener("keydown", (e) => {
        if (!lightbox || !lightbox.classList.contains("open")) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowRight") nextLightbox();
        if (e.key === "ArrowLeft") prevLightbox();
    });

    // Mobile Navbar & Navigation
    const menuBtn = document.querySelector(".menu-btn");
    const navLinks = document.querySelector(".nav-links");
    if (menuBtn && navLinks) {
        menuBtn.addEventListener("click", () => {
            const open = navLinks.classList.toggle("mobile-open");
            menuBtn.textContent = open ? "×" : "☰";
        });
    }

    // Scroll Progress
    const progress = document.querySelector(".progress");
    window.addEventListener("scroll", () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progress && max > 0) {
            progress.style.width = (window.scrollY / max * 100) + "%";
        }
    }, { passive: true });

    // Floating actions / contact widget
    const actions = document.querySelector(".floating-actions");
    const contactBtn = document.querySelector(".floating-contact-btn");
    const socialPopup = document.querySelector(".social-popup");
    const topBtn = document.querySelector(".floating-top");

    function togglePopup() {
        if (!socialPopup || !contactBtn) return;
        const open = socialPopup.classList.toggle("open");
        contactBtn.classList.toggle("active", open);
        contactBtn.setAttribute("aria-expanded", String(open));
    }

    if (contactBtn && socialPopup) {
        contactBtn.addEventListener("click", togglePopup);

        document.addEventListener("click", (e) => {
            if (actions && !actions.contains(e.target)) {
                socialPopup.classList.remove("open");
                contactBtn.classList.remove("active");
                contactBtn.setAttribute("aria-expanded", "false");
            }
        });
    }

    if (topBtn) {
        window.addEventListener("scroll", () => {
            if (actions) {
                actions.classList.toggle("show-scroll", window.scrollY > 300);
            }
        }, { passive: true });
        topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }

    // Run loader
    initProject();
})();
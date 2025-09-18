class SpeciesImageCurator {
    constructor() {
        this.species = [];
        this.filteredSpecies = [];
        this.expandedSpecies = new Set();
        this.totalStats = {
            species: 0,
            images: 0,
            blacklisted: 0,
        };

        this.init();
    }

    async init() {
        await this.loadSpecies();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadSpecies() {
        try {
            const response = await fetch("/api/species");
            this.species = await response.json();
            this.filteredSpecies = [...this.species];
            this.renderSpeciesList();
        } catch (error) {
            console.error("Error loading species:", error);
            this.showError("Failed to load species");
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById("searchInput");
        searchInput.addEventListener("input", (e) => {
            this.filterSpecies(e.target.value);
        });
    }

    filterSpecies(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredSpecies = this.species.filter(
            (species) =>
                species.displayName.toLowerCase().includes(term) ||
                species.name.toLowerCase().includes(term) ||
                (species.vernacularName &&
                    species.vernacularName.toLowerCase().includes(term)) ||
                (species.scientificName &&
                    species.scientificName.toLowerCase().includes(term))
        );
        this.renderSpeciesList();
    }

    renderSpeciesList() {
        const container = document.getElementById("speciesList");

        if (this.filteredSpecies.length === 0) {
            container.innerHTML = '<div class="loading">No species found</div>';
            return;
        }

        container.innerHTML = this.filteredSpecies
            .map(
                (species) => `
            <div class="species-item ${
                this.expandedSpecies.has(species.name) ? "expanded" : ""
            }" 
                 data-species="${species.name}">
                <div class="species-header" onclick="curator.toggleSpecies('${
                    species.name
                }')">
                    <div>
                        <div class="species-name">
                            ${
                                species.vernacularName
                                    ? `<span class="vernacular-name">${species.vernacularName}</span>`
                                    : ""
                            }
                            <span class="scientific-name">${
                                species.displayName
                            }</span>
                        </div>
                        <div class="species-info">
                            <span class="species-count" id="count-${
                                species.name
                            }">Loading...</span>
                            <span class="species-blacklisted" id="blacklisted-${
                                species.name
                            }">Loading...</span>
                        </div>
                    </div>
                    <div class="expand-icon">▼</div>
                </div>
                <div class="images-container">
                    <div class="loading">Loading images...</div>
                </div>
            </div>
        `
            )
            .join("");

        // Load initial stats for visible species
        this.filteredSpecies.forEach((species) => {
            this.loadSpeciesStats(species.name);
        });
    }

    async toggleSpecies(speciesName) {
        const speciesItem = document.querySelector(
            `[data-species="${speciesName}"]`
        );
        const isExpanded = this.expandedSpecies.has(speciesName);

        if (isExpanded) {
            this.expandedSpecies.delete(speciesName);
            speciesItem.classList.remove("expanded");
        } else {
            this.expandedSpecies.add(speciesName);
            speciesItem.classList.add("expanded");
            await this.loadSpeciesImages(speciesName);
        }
    }

    async loadSpeciesStats(speciesName) {
        try {
            const response = await fetch(`/api/species/${speciesName}/images`);
            const data = await response.json();

            const countElement = document.getElementById(
                `count-${speciesName}`
            );
            const blacklistedElement = document.getElementById(
                `blacklisted-${speciesName}`
            );

            if (countElement) {
                countElement.textContent = `${data.totalImages} images`;
            }
            if (blacklistedElement) {
                blacklistedElement.textContent = `${data.blacklistedCount} blacklisted`;
            }
        } catch (error) {
            console.error(`Error loading stats for ${speciesName}:`, error);
        }
    }

    async loadSpeciesImages(speciesName) {
        const imagesContainer = document.querySelector(
            `[data-species="${speciesName}"] .images-container`
        );

        try {
            const response = await fetch(`/api/species/${speciesName}/images`);
            const data = await response.json();

            if (data.images.length === 0) {
                imagesContainer.innerHTML =
                    '<div class="loading">No images found</div>';
                return;
            }

            imagesContainer.innerHTML = `
                <div class="images-grid">
                    ${data.images
                        .map(
                            (image) => `
                        <div class="image-item ${
                            image.isBlacklisted ? "blacklisted" : ""
                        }" 
                             data-species="${speciesName}" 
                             data-image="${image.name}"
                             onclick="curator.toggleImageBlacklist('${speciesName}', '${
                                image.name
                            }', ${image.isBlacklisted})">
                            <img src="/species-images/${speciesName}/${
                                image.name
                            }" 
                                 alt="${image.name}" 
                                 class="image-preview"
                                 loading="lazy">
                            <div class="image-name">${image.name}</div>
                        </div>
                    `
                        )
                        .join("")}
                </div>
            `;
        } catch (error) {
            console.error(`Error loading images for ${speciesName}:`, error);
            imagesContainer.innerHTML =
                '<div class="loading">Error loading images</div>';
        }
    }

    async toggleImageBlacklist(speciesName, imageName, isCurrentlyBlacklisted) {
        // Convert string to boolean if needed
        const isBlacklisted =
            isCurrentlyBlacklisted === true ||
            isCurrentlyBlacklisted === "true";
        const action = isBlacklisted ? "remove" : "add";

        console.log(
            `Toggling ${speciesName}/${imageName}: currently blacklisted=${isBlacklisted}, action=${action}`
        );

        try {
            const response = await fetch(
                `/api/species/${speciesName}/blacklist/${imageName}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ action }),
                }
            );

            if (response.ok) {
                const result = await response.json();

                // Update the image item appearance with visual feedback
                const imageItem = document.querySelector(
                    `[data-species="${speciesName}"][data-image="${imageName}"]`
                );
                if (imageItem) {
                    // Add a brief highlight effect
                    imageItem.style.transition = "all 0.3s ease";
                    imageItem.style.transform = "scale(1.05)";
                    imageItem.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.3)";

                    setTimeout(() => {
                        if (result.isBlacklisted) {
                            imageItem.classList.add("blacklisted");
                        } else {
                            imageItem.classList.remove("blacklisted");
                        }
                        imageItem.style.transform = "scale(1)";
                        imageItem.style.boxShadow = "";

                        // Update the onclick attribute with the new blacklist status
                        const newOnclick = `curator.toggleImageBlacklist('${speciesName}', '${imageName}', ${result.isBlacklisted})`;
                        imageItem.setAttribute("onclick", newOnclick);
                        console.log(
                            `Updated onclick for ${imageName}: ${newOnclick}`
                        );
                    }, 150);
                }

                // Update species stats
                await this.loadSpeciesStats(speciesName);
                this.updateGlobalStatsForSpecies(speciesName);

                // Show success feedback
                this.showSuccess(
                    `Image ${
                        result.isBlacklisted ? "blacklisted" : "unblacklisted"
                    } successfully`
                );
            } else {
                throw new Error("Failed to update blacklist");
            }
        } catch (error) {
            console.error("Error toggling blacklist:", error);
            this.showError("Failed to update blacklist");
        }
    }

    async updateGlobalStats() {
        try {
            let totalImages = 0;
            let totalBlacklisted = 0;

            // Get stats from all species
            const promises = this.species.map(async (species) => {
                try {
                    const response = await fetch(
                        `/api/species/${species.name}/images`
                    );
                    const data = await response.json();
                    return {
                        images: data.totalImages,
                        blacklisted: data.blacklistedCount,
                    };
                } catch (error) {
                    console.error(
                        `Error getting stats for ${species.name}:`,
                        error
                    );
                    return { images: 0, blacklisted: 0 };
                }
            });

            const results = await Promise.all(promises);

            results.forEach((stats) => {
                totalImages += stats.images;
                totalBlacklisted += stats.blacklisted;
            });

            this.totalStats = {
                species: this.species.length,
                images: totalImages,
                blacklisted: totalBlacklisted,
            };

            this.updateStats();
        } catch (error) {
            console.error("Error updating global stats:", error);
        }
    }

    async updateGlobalStatsForSpecies(speciesName) {
        try {
            // Get updated stats for just this species
            const response = await fetch(`/api/species/${speciesName}/images`);
            const data = await response.json();

            // Calculate the difference from what we had before
            const countElement = document.getElementById(
                `count-${speciesName}`
            );
            const blacklistedElement = document.getElementById(
                `blacklisted-${speciesName}`
            );

            let oldImages = 0;
            let oldBlacklisted = 0;

            if (countElement) {
                const countText = countElement.textContent;
                const match = countText.match(/(\d+) images/);
                if (match) oldImages = parseInt(match[1]);
            }

            if (blacklistedElement) {
                const blacklistedText = blacklistedElement.textContent;
                const match = blacklistedText.match(/(\d+) blacklisted/);
                if (match) oldBlacklisted = parseInt(match[1]);
            }

            // Update global stats with the difference
            const imageDiff = data.totalImages - oldImages;
            const blacklistedDiff = data.blacklistedCount - oldBlacklisted;

            this.totalStats.images += imageDiff;
            this.totalStats.blacklisted += blacklistedDiff;

            this.updateStats();
        } catch (error) {
            console.error("Error updating global stats for species:", error);
        }
    }

    updateStats() {
        document.getElementById("totalSpecies").textContent =
            this.totalStats.species;
        document.getElementById("totalImages").textContent =
            this.totalStats.images;
        document.getElementById("blacklistedImages").textContent =
            this.totalStats.blacklisted;
    }

    showSuccess(message) {
        // Simple success notification
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        // Simple error notification
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the application when the page loads
let curator;
document.addEventListener("DOMContentLoaded", () => {
    curator = new SpeciesImageCurator();
});

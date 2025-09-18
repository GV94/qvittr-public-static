const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Serve static files from species-images directory
app.use(
    "/species-images",
    express.static(path.join(__dirname, "..", "species-images"))
);

// API Routes

// Get all species directories
app.get("/api/species", async (req, res) => {
    try {
        const speciesDir = path.join(__dirname, "..", "species-images");
        const entries = await fs.readdir(speciesDir, { withFileTypes: true });

        const species = await Promise.all(
            entries
                .filter((entry) => entry.isDirectory())
                .map(async (entry) => {
                    const speciesPath = path.join(speciesDir, entry.name);
                    const metadataPath = path.join(
                        speciesPath,
                        "metadata.json"
                    );

                    let vernacularName = null;
                    let scientificName = null;
                    let hasImages = false;

                    // Check if directory has any image files
                    try {
                        const speciesEntries = await fs.readdir(speciesPath, {
                            withFileTypes: true,
                        });
                        hasImages = speciesEntries.some(
                            (item) =>
                                item.isFile() &&
                                /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name) &&
                                !item.name.includes("_thumb.")
                        );
                    } catch (error) {
                        console.warn(
                            `Could not read directory ${entry.name}:`,
                            error.message
                        );
                    }

                    // Skip directories without images
                    if (!hasImages) {
                        return null;
                    }

                    // Try to read metadata.json
                    try {
                        if (await fs.pathExists(metadataPath)) {
                            const metadata = await fs.readJson(metadataPath);
                            vernacularName = metadata.vernacularName || null;
                            scientificName = metadata.scientificName || null;
                        }
                    } catch (error) {
                        console.warn(
                            `Could not read metadata for ${entry.name}:`,
                            error.message
                        );
                    }

                    return {
                        name: entry.name,
                        displayName: entry.name
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase()),
                        vernacularName: vernacularName,
                        scientificName: scientificName,
                    };
                })
        );

        // Filter out null entries (directories without images)
        const speciesWithImages = species.filter((species) => species !== null);

        // Sort by vernacular name if available, otherwise by display name
        speciesWithImages.sort((a, b) => {
            const aName = a.vernacularName || a.displayName;
            const bName = b.vernacularName || b.displayName;
            return aName.localeCompare(bName);
        });

        res.json(speciesWithImages);
    } catch (error) {
        console.error("Error reading species directories:", error);
        res.status(500).json({ error: "Failed to read species directories" });
    }
});

// Get images for a specific species
app.get("/api/species/:speciesName/images", async (req, res) => {
    try {
        const { speciesName } = req.params;
        const speciesPath = path.join(
            __dirname,
            "..",
            "species-images",
            speciesName
        );

        // Check if species directory exists
        if (!(await fs.pathExists(speciesPath))) {
            return res.status(404).json({ error: "Species not found" });
        }

        // Read blacklist
        const blacklistPath = path.join(speciesPath, "blacklist.json");
        let blacklist = [];
        if (await fs.pathExists(blacklistPath)) {
            const blacklistData = await fs.readJson(blacklistPath);
            blacklist = Array.isArray(blacklistData) ? blacklistData : [];
        }

        // Read metadata to get default image
        const metadataPath = path.join(speciesPath, "metadata.json");
        let defaultImage = null;
        if (await fs.pathExists(metadataPath)) {
            try {
                const metadata = await fs.readJson(metadataPath);
                defaultImage = metadata.defaultImage || null;
            } catch (error) {
                console.warn(
                    `Could not read metadata for ${speciesName}:`,
                    error.message
                );
            }
        }

        // Get all image files
        const entries = await fs.readdir(speciesPath, { withFileTypes: true });
        const imageFiles = entries
            .filter(
                (entry) =>
                    entry.isFile() &&
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)
            )
            .map((entry) => ({
                name: entry.name,
                isBlacklisted: blacklist.includes(entry.name),
                isThumbnail: entry.name.includes("_thumb."),
                isDefault: entry.name === defaultImage,
            }))
            .filter((img) => !img.isThumbnail && !img.isDefault) // Only show main images, not thumbnails or default images
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            species: speciesName,
            images: imageFiles,
            totalImages: imageFiles.length,
            blacklistedCount: imageFiles.filter((img) => img.isBlacklisted)
                .length,
        });
    } catch (error) {
        console.error("Error reading species images:", error);
        res.status(500).json({ error: "Failed to read species images" });
    }
});

// Toggle blacklist status for an image
app.post("/api/species/:speciesName/blacklist/:imageName", async (req, res) => {
    try {
        const { speciesName, imageName } = req.params;
        const { action } = req.body; // 'add' or 'remove'

        const speciesPath = path.join(
            __dirname,
            "..",
            "species-images",
            speciesName
        );
        const blacklistPath = path.join(speciesPath, "blacklist.json");

        // Check if species directory exists
        if (!(await fs.pathExists(speciesPath))) {
            return res.status(404).json({ error: "Species not found" });
        }

        // Read current blacklist
        let blacklist = [];
        if (await fs.pathExists(blacklistPath)) {
            const blacklistData = await fs.readJson(blacklistPath);
            blacklist = Array.isArray(blacklistData) ? blacklistData : [];
        }

        // Update blacklist
        if (action === "add" && !blacklist.includes(imageName)) {
            blacklist.push(imageName);
        } else if (action === "remove") {
            blacklist = blacklist.filter((img) => img !== imageName);
        }

        // Write updated blacklist
        await fs.writeJson(blacklistPath, blacklist, { spaces: 2 });

        res.json({
            success: true,
            imageName,
            action,
            isBlacklisted: action === "add",
        });
    } catch (error) {
        console.error("Error updating blacklist:", error);
        res.status(500).json({ error: "Failed to update blacklist" });
    }
});

// Get blacklist for a species
app.get("/api/species/:speciesName/blacklist", async (req, res) => {
    try {
        const { speciesName } = req.params;
        const blacklistPath = path.join(
            __dirname,
            "..",
            "species-images",
            speciesName,
            "blacklist.json"
        );

        let blacklist = [];
        if (await fs.pathExists(blacklistPath)) {
            const blacklistData = await fs.readJson(blacklistPath);
            blacklist = Array.isArray(blacklistData) ? blacklistData : [];
        }

        res.json({ species: speciesName, blacklist });
    } catch (error) {
        console.error("Error reading blacklist:", error);
        res.status(500).json({ error: "Failed to read blacklist" });
    }
});

// Serve the main application
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Image Curator server running at http://localhost:${PORT}`);
    console.log("Access the application at: http://localhost:3000");
});

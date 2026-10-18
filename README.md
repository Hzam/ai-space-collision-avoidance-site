[العربية](README_AR.md) | English

# Early Collision-Risk Prediction from Real ESA Conjunction Data Linked to Simulated RGB-YOLO Perception and Minimum-Δv Avoidance Maneuver Selection

**Ibdaa 2027 Student Research Project**

This repository contains only the static bilingual project website, published with GitHub Pages:

**https://hzam.github.io/ai-space-collision-avoidance-site/** ([English](https://hzam.github.io/ai-space-collision-avoidance-site/en/) · [العربية](https://hzam.github.io/ai-space-collision-avoidance-site/ar/))

## What the website shows

A research prototype that links early collision-risk assessment for satellites with an onboard perception and avoidance-maneuver chain:

| Part | Status |
|---|---|
| ESA Collision Avoidance Challenge conjunction data (CDMs) and the collision-risk prediction experiment | **REAL DATA** |
| RGB imagery, YOLO onboard-vision experiment, tracking sequences | **SIMULATED** |
| Avoidance-maneuver execution (evaluated on the real encounter geometry of ESA events) | **SIMULATED** |

The site presents verified, precomputed results only, including negative results and limitations. Nothing is trained or computed in the browser.

## Data source

ESA Collision Avoidance Challenge dataset, © ESA, CC BY 4.0, [doi:10.5281/zenodo.4463683](https://doi.org/10.5281/zenodo.4463683). The dataset is not hosted here.

## Structure

`index.html` (language choice), `en/`, `ar/`, `assets/` (style, script, translations, verified result values, figures, demo frames). Deployment: `.github/workflows/pages.yml`.

# 🍎🍅 Web Crawler & Search Engine

## Overview

This project is a **full-stack web crawler and search engine** that indexes and searches content across multiple websites, including a structured content site and a media-rich site (Rotten Tomatoes). The system supports **large-scale crawling, indexing, ranking, and querying**, and exposes results through a **browser-based search interface**.

The project focuses on **information retrieval concepts**, **web crawling**, **PageRank-based ranking**, and **distributed search integration**, demonstrating how modern search engines collect, score, and present web content.

---

## Project Contributors

* **Leo Xu** (Contributor)
* Kenji Isak Laguan
* Minh Nguyen

---

## Demo

▶️ **Video Walkthrough**
[![Project Demo](https://img.youtube.com/vi/ojB-zY3dfFw/maxresdefault.jpg)](https://www.youtube.com/watch?v=ojB-zY3dfFw)

---

## Key Features

### 🌐 Web Crawling

* Crawls multiple domains, including:

  * A structured content website (fruits)
  * A media-heavy site (Rotten Tomatoes)
* Extracts and indexes:

  * Page titles
  * Paragraph content
  * Movie metadata (titles, cast, crew)
* Supports crawling up to **500 links per site**

---

### 🔍 Search & Ranking

* Keyword-based search over indexed content
* Query parameters include:

  * `q`: Search query text
  * `boost`: Optional PageRank-based boosting
  * `limit`: Configurable number of results (default: 10, range: 1–50)
* Invalid query inputs gracefully fall back to defaults

---

### 📈 Ranking & Scoring

* Computes **PageRank values** across the crawl graph
* Displays:

  * Search relevance score
  * PageRank contribution
  * Page title and original URL

---

### 🖥️ Web Interface

* Browser-based UI for:

  * Submitting search queries
  * Viewing ranked search results
* Each result includes:

  * Link to the original page
  * “View Details” page with expanded metadata

---

### 📄 Page Details View

* Displays:

  * Page URL and title
  * Incoming and outgoing links
  * Word-frequency statistics
* Provides transparency into indexing and ranking behavior

---

### ⚙️ Distributed Search Integration

* Integrated with a **distributed search service** to support scalable querying
* Demonstrates separation of crawling, indexing, and query execution

---

## Technologies Used

* **Backend:** Python
* **Web Crawling:** Custom crawler
* **Ranking:** PageRank algorithm
* **Search:** Inverted index–based retrieval
* **Frontend:** Browser-based interface
* **Architecture:** Distributed search integration

---

## Why This Project Matters

This project demonstrates practical experience with:

* Web crawling at scale
* Search engine architecture and ranking algorithms
* Graph-based ranking (PageRank)
* Designing user-facing search systems
* Integrating distributed services

It provides a strong foundation in **information retrieval systems** and mirrors core components used in real-world search engines.

---

## Repository Structure

* Crawler implementation
* Search and ranking logic
* Web interface
* Distributed search integration

---

## Contributor Role

I contributed to the design and implementation of the crawler, search functionality, ranking integration, and overall system behavior, ensuring correctness, robustness, and usability.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import {
  IconLightning,
  IconRobot,
  IconPalette,
  IconBarChart,
  IconShield,
  IconTrophy,
  IconHeart,
} from "@/components/Icons";

export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem("user_id");
    if (uid) setLoggedIn(true);
  }, []);

  return (
    <>
      {/* Background */}
      <div className="bg-animated">
        <div className="orb" />
        <div className="orb" />
        <div className="orb" />
      </div>
      <div className="bg-grid" />

      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <span className="pulse-dot" />
          Competitive Coding Platform
        </div>
        <h1>
          Master Algorithms.
          <br />
          <span className="gradient-text">Build Your Future.</span>
        </h1>
        <p>
          A VS Code–inspired competitive coding platform with real-time
          execution, AI-powered hints, and beautiful themes. Practice smarter,
          code faster.
        </p>
        <div className="hero-actions">
          <Link
            href={loggedIn ? "/problems" : "/login"}
            className="hero-btn-primary"
          >
            <svg viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Coding Now
          </Link>
          <Link href="#features" className="hero-btn-outline">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" />
            </svg>
            See How It Works
          </Link>
        </div>
      </section>

      {/* Stats Strip */}
      <div className="stats-strip">
        <div className="strip-stat">
          <div className="num">50+</div>
          <div className="label">Coding Problems</div>
        </div>
        <div className="strip-stat">
          <div className="num">5</div>
          <div className="label">VS Code Themes</div>
        </div>
        <div className="strip-stat">
          <div className="num">2</div>
          <div className="label">Languages</div>
        </div>
        <div className="strip-stat">
          <div className="num">AI</div>
          <div className="label">Powered Hints</div>
        </div>
      </div>

      {/* IDE Preview */}
      <section className="preview-section">
        <div className="preview-window">
          <div className="preview-titlebar">
            <span className="preview-dot r" />
            <span className="preview-dot y" />
            <span className="preview-dot g" />
            <span style={{ marginLeft: 8 }}>solution.py — AlgoArena</span>
          </div>
          <div className="preview-body">
            <div className="preview-sidebar">
              <div className="preview-sidebar-item active">
                <span
                  className="dot"
                  style={{ background: "var(--diff-easy)" }}
                />
                Two Sum
              </div>
              <div className="preview-sidebar-item">
                <span
                  className="dot"
                  style={{ background: "var(--diff-medium)" }}
                />
                Max Subarray
              </div>
              <div className="preview-sidebar-item">
                <span
                  className="dot"
                  style={{ background: "var(--diff-hard)" }}
                />
                Valid Parens
              </div>
              <div className="preview-sidebar-item">
                <span
                  className="dot"
                  style={{ background: "var(--diff-easy)" }}
                />
                Palindrome
              </div>
              <div className="preview-sidebar-item">
                <span
                  className="dot"
                  style={{ background: "var(--diff-medium)" }}
                />
                Fibonacci
              </div>
            </div>
            <div className="preview-main">
              <pre className="preview-code">
                {`  `}
                <span className="cm"># Two Sum — O(n) hash map solution</span>
                {`
  `}
                <span className="kw">def</span>
                {` `}
                <span className="fn">twoSum</span>
                {`(self, nums, target):
      seen = {}
      `}
                <span className="kw">for</span>
                {` i, n `}
                <span className="kw">in</span>
                {` enumerate(nums):
          comp = target - n
          `}
                <span className="kw">if</span>
                {` comp `}
                <span className="kw">in</span>
                {` seen:
              `}
                <span className="kw">return</span>
                {` [seen[comp], i]
          seen[n] = i`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="section-label">Why AlgoArena?</div>
        <h2>Everything You Need to Excel</h2>
        <p className="sub">
          A complete competitive coding environment built for learning,
          practicing, and mastering algorithms — all in your browser.
        </p>
        <div className="features-grid stagger">
          <div className="feature-card">
            <div
              className="feature-icon"
              style={{ background: "rgba(137,180,250,0.12)", color: "#89b4fa" }}
            >
              <IconLightning />
            </div>
            <h3>Real-Time Execution</h3>
            <p>
              Run Python & C++ code in isolated Docker containers with instant
              feedback and test case validation.
            </p>
          </div>
          <div className="feature-card">
            <div
              className="feature-icon"
              style={{ background: "rgba(203,166,247,0.12)", color: "#cba6f7" }}
            >
              <IconRobot />
            </div>
            <h3>AI-Powered Hints</h3>
            <p>
              Get intelligent hints from Gemini AI that guide you without giving
              away the answer.
            </p>
          </div>
          <div className="feature-card">
            <div
              className="feature-icon"
              style={{ background: "rgba(166,227,161,0.12)", color: "#a6e3a1" }}
            >
              <IconPalette />
            </div>
            <h3>5 Beautiful Themes</h3>
            <p>
              Switch between One Dark, GitHub Light, Monokai Pro, Dracula, and
              Nord — all VS Code-inspired.
            </p>
          </div>
          <div className="feature-card">
            <div
              className="feature-icon"
              style={{ background: "rgba(249,226,175,0.12)", color: "#f9e2af" }}
            >
              <IconBarChart />
            </div>
            <h3>Progress Tracking</h3>
            <p>
              Visualize your journey with heatmaps, difficulty breakdowns, and
              detailed submission history.
            </p>
          </div>
          <div className="feature-card">
            <div
              className="feature-icon"
              style={{ background: "rgba(137,220,235,0.12)", color: "#89dceb" }}
            >
              <IconShield />
            </div>
            <h3>Sandboxed Execution</h3>
            <p>
              Each submission runs in an isolated Docker container with memory
              limits and timeout protection.
            </p>
          </div>
          <div className="feature-card">
            <div
              className="feature-icon"
              style={{ background: "rgba(243,139,168,0.12)", color: "#f38ba8" }}
            >
              <IconTrophy />
            </div>
            <h3>Admin Dashboard</h3>
            <p>
              Create problems with AI, manage test cases, view platform
              analytics — all from one powerful panel.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <h2>How It Works</h2>
        <div className="how-steps stagger">
          <div className="how-step">
            <div className="step-num">1</div>
            <div className="step-content">
              <h3>Pick a Challenge</h3>
              <p>
                Browse problems by difficulty. Each has clear descriptions,
                examples, and constraints.
              </p>
            </div>
          </div>
          <div className="how-step">
            <div className="step-num">2</div>
            <div className="step-content">
              <h3>Write Your Solution</h3>
              <p>
                Use the Monaco-powered editor with syntax highlighting,
                auto-completion, and your favorite theme.
              </p>
            </div>
          </div>
          <div className="how-step">
            <div className="step-num">3</div>
            <div className="step-content">
              <h3>Run &amp; Submit</h3>
              <p>
                Execute against test cases in real-time. See pass/fail for each
                case with detailed output.
              </p>
            </div>
          </div>
          <div className="how-step">
            <div className="step-num">4</div>
            <div className="step-content">
              <h3>Level Up</h3>
              <p>
                Track progress, earn badges, and use AI hints to master
                increasingly complex algorithms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-card">
          <h2>Ready to Start Coding?</h2>
          <p>
            Join AlgoArena today and take your algorithm skills to the next
            level. It&#39;s free and built for developers like you.
          </p>
          <Link
            href={loggedIn ? "/problems" : "/login"}
            className="hero-btn-primary"
            style={{ display: "inline-flex" }}
          >
            <svg
              viewBox="0 0 24 24"
              style={{
                width: 18,
                height: 18,
                stroke: "currentColor",
                fill: "none",
                strokeWidth: 2,
                strokeLinecap: "round",
                strokeLinejoin: "round",
              }}
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        Built with{" "}
        <IconHeart
          style={{
            width: 14,
            height: 14,
            color: "#f38ba8",
            verticalAlign: "middle",
            margin: "0 3px",
          }}
        />{" "}
        for developers · <Link href="https://github.com">GitHub</Link> ·
        AlgoArena © {new Date().getFullYear()}
      </footer>
    </>
  );
}

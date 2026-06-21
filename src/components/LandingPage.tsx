import { ArrowRight, BarChart3, TrendingUp, ShieldCheck, Zap, CheckCircle } from "lucide-react";

export function LandingPage({ onStartTrial, onSignIn }: { onStartTrial?: () => void; onSignIn?: () => void }) {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-container">
          <div className="nav-left">
            <div className="nav-logo">
              <div className="logo-mark">R</div>
              <span className="logo-text">Rai</span>
            </div>
          </div>
          <div className="nav-right">
            <a href="#features" className="nav-link">Features</a>
            <a href="#benefits" className="nav-link">Benefits</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <button className="nav-btn-primary" onClick={onSignIn}>Sign In</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={16} />
              <span>AI-Powered Pharmacy Intelligence</span>
            </div>
            <h1 className="hero-title">
              Transform Your Pharmacy Business with AI-Driven Insights
            </h1>
            <p className="hero-description">
              Rai brings enterprise-grade business intelligence to pharmacies of any size. Forecast demand, optimize inventory, maximize profits, and make data-driven decisions in seconds.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={onStartTrial}>
                Start Free Trial
                <ArrowRight size={18} />
              </button>
              <button className="btn-secondary">Watch Demo</button>
            </div>
            <p className="hero-footnote">
              No credit card required • Free for 14 days • Works with RxLedger or any pharmacy system
            </p>
          </div>
          <div className="hero-visual">
            <div className="hero-card hero-card-1">
              <div className="card-badge success">↑ 23%</div>
              <p>Revenue Growth</p>
            </div>
            <div className="hero-card hero-card-2">
              <div className="card-badge primary">↓ 18%</div>
              <p>Waste Reduction</p>
            </div>
            <div className="hero-card hero-card-3">
              <div className="card-badge accent">⚡ 4.2x</div>
              <p>Faster Forecasts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <h2>Powerful Features Built for Pharmacy Operations</h2>
            <p>Everything you need to run a smarter pharmacy business</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon primary">
                <TrendingUp size={24} />
              </div>
              <h3>Demand Forecasting</h3>
              <p>Predict medication demand with 95%+ accuracy using real-world scenarios and historical data patterns.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon success">
                <BarChart3 size={24} />
              </div>
              <h3>Inventory Optimization</h3>
              <p>Automatically manage stock levels to minimize waste while ensuring medications are always available.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon accent">
                <ShieldCheck size={24} />
              </div>
              <h3>Expiry Management</h3>
              <p>Track medication expiry dates and get actionable recommendations to reduce losses and maximize ROI.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon warning">
                <Zap size={24} />
              </div>
              <h3>Profit Maximization</h3>
              <p>Identify margin opportunities and optimize pricing strategies based on real market data and demand.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon primary">
                <BarChart3 size={24} />
              </div>
              <h3>Budget Planning</h3>
              <p>Create accurate financial forecasts and budgets with AI-assisted planning for better decision making.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon success">
                <CheckCircle size={24} />
              </div>
              <h3>Real-Time Analytics</h3>
              <p>Get instant insights into your business performance with easy-to-understand dashboards and reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="landing-section alt">
        <div className="landing-container">
          <div className="section-header">
            <h2>Why Pharmacies Choose Rai</h2>
            <p>Trusted by pharmacy teams to drive growth and efficiency</p>
          </div>
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-number">1</div>
              <h3>Enterprise-Grade Security</h3>
              <p>Your pharmacy data is encrypted and protected with enterprise-grade security standards.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-number">2</div>
              <h3>Easy Integration</h3>
              <p>Works seamlessly with RxLedger or import your own data from any pharmacy system.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-number">3</div>
              <h3>No Technical Skills Required</h3>
              <p>Simple, intuitive AI chat interface makes advanced analytics accessible to everyone.</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-number">4</div>
              <h3>Measurable ROI</h3>
              <p>See clear results: reduced waste, increased revenue, and better inventory management within weeks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="section-header">
            <h2>Built for Different Pharmacy Roles</h2>
            <p>Each team member gets insights tailored to their needs</p>
          </div>
          <div className="roles-grid">
            <div className="role-card">
              <div className="role-icon">👨‍💼</div>
              <h3>Pharmacy Owner</h3>
              <ul>
                <li>Monitor total profitability</li>
                <li>Track revenue trends</li>
                <li>Get strategic recommendations</li>
              </ul>
            </div>
            <div className="role-card">
              <div className="role-icon">💊</div>
              <h3>Pharmacist</h3>
              <ul>
                <li>Optimize medication stock</li>
                <li>Manage expiry schedules</li>
                <li>Answer patient questions faster</li>
              </ul>
            </div>
            <div className="role-card">
              <div className="role-icon">📦</div>
              <h3>Inventory Manager</h3>
              <ul>
                <li>Forecast demand accurately</li>
                <li>Reduce waste</li>
                <li>Plan purchasing smartly</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="landing-section alt">
        <div className="landing-container">
          <div className="section-header">
            <h2>Built on Trust and Compliance</h2>
          </div>
          <div className="trust-grid">
            <div className="trust-badge">
              <ShieldCheck size={20} />
              <span>HIPAA Compliant</span>
            </div>
            <div className="trust-badge">
              <ShieldCheck size={20} />
              <span>Data Encryption</span>
            </div>
            <div className="trust-badge">
              <ShieldCheck size={20} />
              <span>Regular Audits</span>
            </div>
            <div className="trust-badge">
              <ShieldCheck size={20} />
              <span>No Personal Data Sharing</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-section cta">
        <div className="landing-container">
          <h2>Ready to Transform Your Pharmacy?</h2>
          <p>Join pharmacy teams already using Rai to make smarter business decisions.</p>
          <button className="btn-primary btn-large" onClick={onStartTrial}>
            Start Your Free Trial Today
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo-mark">R</div>
              <div>
                <p className="footer-title">Rai</p>
                <p className="footer-subtitle">Pharmacy Business Intelligence</p>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#">Documentation</a>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <a href="#">About</a>
                <a href="#">Blog</a>
                <a href="#">Contact</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Compliance</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Rai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

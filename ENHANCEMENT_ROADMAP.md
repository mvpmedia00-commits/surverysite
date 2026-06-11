# MVP Media Photography - Enhancement Roadmap

## Current Status (Latest Commits)

- **Landing Page** (`landing.html`): Professional intro with trust signals, process explanation, and CTA buttons ✅
- **Database Schemas**: Both tables now include `admin_notes` column ✅  
- **API Responses**: Dashboard APIs return `admin_notes` field ✅
- **Project Documentation**: Complete reference guide ✅

---

## Remaining Enhancements (Ready to Implement)

### Phase 2A: Contact Buttons & Admin Notes UI

#### 1. Add Contact Button Bar to Dashboard Profile Modal

**File**: `dashboard.html` (line ~620-705, `renderProfile` function)

**Add after profile content**:

```javascript
const renderProfile = (candidate) => {
  // ... existing code ...
  
  content.innerHTML = `
    ${/* existing profile sections */}
    
    <section class="profile-section" style="background: #f0f7f6; padding: 20px; border-radius: 8px; margin-top: 20px;">
      <h3>Admin Actions</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
        <button class="action-btn" onclick="window.open('mailto:${candidate.email}')">📧 Email</button>
        <button class="action-btn" onclick="window.open('https://instagram.com/${candidate.instagram?.replace('@', '')}', '_blank')">📸 Instagram</button>
        <button class="action-btn" onclick="copyToClipboard('${candidate.email}')">📋 Copy Email</button>
        <button class="action-btn" onclick="generateWhatsApp('${candidate.full_name}', '${candidate.phone || ''}')">💬 WhatsApp</button>
        <button class="action-btn" onclick="markContacted('${candidate.id}')">✓ Mark Contacted</button>
      </div>
      
      <div style="margin-top: 15px;">
        <label for="adminNotes" style="display: block; font-weight: 600; margin-bottom: 8px;">Admin Notes:</label>
        <textarea 
          id="adminNotes"
          placeholder="Add notes (contacted on IG, wants paid only, good for editorial, etc.)"
          style="width: 100%; min-height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;"
        >${candidate.admin_notes || ''}</textarea>
        <button class="save-btn" onclick="saveAdminNotes('${candidate.id}')">Save Notes</button>
      </div>
    </section>
  `;
};
```

**Add helper functions** (after `renderProfile`):

```javascript
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard');
};

const generateWhatsApp = (name, phone) => {
  const message = `Hi ${name}, this is Matthew from MVP Media Photography. Thank you for applying. I reviewed your application and wanted to see if you're still interested in a creative photoshoot opportunity.`;
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${phone}?text=${encoded}`;
  window.open(url, '_blank');
};

const markContacted = async (candidateId) => {
  // This updates status to 'contacted'
  await updateCandidateStatus(candidateId, 'contacted');
  alert('Marked as contacted');
};

const saveAdminNotes = async (candidateId) => {
  const notes = document.getElementById('adminNotes').value;
  const response = await adminFetch('/api/dashboard', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      id: candidateId, 
      admin_notes: notes,
      status: state.activeCandidateId ? 
        state.candidates.find(c => c.id === candidateId)?.review_status : 'pending'
    })
  });
  if (response.ok) {
    alert('Notes saved');
    await loadDashboard();
  } else {
    alert('Failed to save notes');
  }
};
```

**Add CSS** (in dashboard.html `<style>` block):

```css
.action-btn {
  padding: 8px 12px;
  background: #0e6b62;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.3s;
}

.action-btn:hover {
  background: #0a5448;
}

.save-btn {
  padding: 10px 20px;
  background: #da7c4f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 10px;
  transition: background 0.3s;
}

.save-btn:hover {
  background: #c96a3a;
}
```

#### 2. Update PATCH Handler to Save Admin Notes

**File**: `api/dashboard.js` (line ~85-105, PATCH section)

Current code saves only `review_status`. Update to also save `admin_notes`:

```javascript
if (req.method === "PATCH") {
  const body = req.body || {};
  const id = body.id;
  const status = body.status;
  const admin_notes = body.admin_notes;
  const allowed = ["pending", "contacted", "scheduled", "approved", "archived", "denied"];

  if (!id || !allowed.includes(status)) {
    return respond(res, 400, { error: "Invalid id or status" });
  }

  const updatePayload = {
    review_status: status,
    review_updated_at: new Date().toISOString()
  };
  
  if (admin_notes !== undefined) {
    updatePayload.admin_notes = admin_notes;
  }

  const updateResponse = await fetch(
    `${supabaseUrl}/rest/v1/model_applications?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Content-Profile": "public",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(updatePayload)
    }
  );

  if (!updateResponse.ok) {
    const detail = await updateResponse.text();
    return respond(res, 500, { error: "Failed to update candidate", detail });
  }

  return respond(res, 200, { ok: true });
}
```

---

### Phase 2B: Source Tracking with URL Parameters

#### 1. Add URL Parameter Auto-Fill to Survey Forms

**File**: `index.html` (line ~560, before `<script>` tag with form logic)

**Add at top of form script**:

```javascript
const sourceOptions = {
  'instagram': 'Instagram',
  'tiktok': 'TikTok',
  'facebook': 'Facebook Group',
  'referral': 'Referral',
  'google': 'Google Search',
  'modelmayhem': 'Model Mayhem',
  'purpleport': 'PurplePort',
  'kavyar': 'Kavyar',
  'casting': 'Casting Call',
  'whatsapp': 'WhatsApp',
  'other': 'Other'
};

const getSourceFromURL = () => {
  const params = new URLSearchParams(window.location.search);
  const source = params.get('source');
  return sourceOptions[source?.toLowerCase()] || null;
};

const initializeSourceField = () => {
  const source = getSourceFromURL();
  if (source) {
    const select = document.getElementById('hear_about') || document.querySelector('select[name="hear_about"]');
    if (select && Array.from(select.options).some(opt => opt.value === source)) {
      select.value = source;
      // Optionally lock/disable the field
      // select.disabled = true;
    }
  }
};

// Call on page load
window.addEventListener('DOMContentLoaded', initializeSourceField);
```

**Usage URLs**:
```
https://surverysite.vercel.app/index.html?source=instagram
https://surverysite.vercel.app/index.html?source=tiktok
https://surverysite.vercel.app/index.html?source=whatsapp
https://surverysite.vercel.app/artistic-nude-survey.html?source=google
```

#### 2. Add Improved Source Options to Survey Forms

**File**: `index.html` (find `<select name="hear_about">` dropdown)

**Replace options with**:

```html
<select name="hear_about" required>
  <option value="">- How did you hear about us? -</option>
  <option value="Instagram">Instagram</option>
  <option value="TikTok">TikTok</option>
  <option value="Facebook Group">Facebook Group</option>
  <option value="Model Mayhem">Model Mayhem</option>
  <option value="PurplePort">PurplePort</option>
  <option value="Kavyar">Kavyar</option>
  <option value="Referral">Referral</option>
  <option value="Casting Call">Casting Call</option>
  <option value="WhatsApp">WhatsApp</option>
  <option value="Google Search">Google Search</option>
  <option value="Other">Other</option>
</select>
```

---

### Phase 2C: Model Fit Scoring Algorithm

#### 1. Add Fit Score Calculation to API

**File**: `api/dashboard.js` (after candidates mapping, line ~200)

**Add function**:

```javascript
const calculateFitScore = (row) => {
  let score = 0;
  
  // Photos: +20 each
  if (row.headshot_filename) score += 20;
  if (row.full_body_filename) score += 20;
  
  // Social media: +20 for Instagram or +10 for TikTok
  if (row.instagram) score += 20;
  if (row.tiktok) score += 10;
  
  // Experience: +10
  if (row.experience && row.experience !== 'Beginner') score += 10;
  
  // Open to TFP: +10
  if (row.unpaid_tfp_willing === true) score += 10;
  
  // Boundaries filled: +10
  if (row.avoid_concepts && row.avoid_concepts.trim().length > 0) score += 10;
  
  // Availability filled: +10
  if (Array.isArray(row.availability) && row.availability.length > 0) score += 10;
  
  // Local/nearby: +5
  if (row.travel_willing === 'Local only') score += 5;
  
  // Willingness to travel: +5
  if (row.travel_willing === 'Yes' || row.travel_willing === 'Regional') score += 5;
  
  return Math.min(score, 100); // Cap at 100
};
```

**Update candidates mapping**:

```javascript
const candidates = rows
  .slice()
  .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
  .map((row) => ({
    // ... existing fields ...
    fit_score: calculateFitScore(row)
  }));
```

#### 2. Add Fit Badge to Dashboard List

**File**: `dashboard.html` (in renderCandidates function, line ~790)

**Update candidate card**:

```javascript
const getFitLabel = (score) => {
  if (score >= 70) return 'High Fit';
  if (score >= 40) return 'Medium Fit';
  return 'Low Fit';
};

const getFitColor = (score) => {
  if (score >= 70) return '#136f40'; // green
  if (score >= 40) return '#da7c4f'; // orange
  return '#9e1b1b'; // red
};

// In renderCandidates, update card HTML:
filtered.forEach((candidate) => {
  const card = document.createElement("article");
  card.className = "candidate";
  card.dataset.candidateId = candidate.id;
  const fitLabel = getFitLabel(candidate.fit_score || 0);
  const fitColor = getFitColor(candidate.fit_score || 0);
  
  card.innerHTML = `
    <div class="candidate-top">
      <div>
        <h3 class="candidate-name">${candidate.full_name}</h3>
        <p class="candidate-meta">${candidate.email} · ${candidate.city}, ${candidate.country}</p>
        <p class="candidate-meta">Experience: ${candidate.experience} · Source: ${candidate.hear_about}</p>
        <p class="candidate-meta">Fit Score: <span style="color: ${fitColor}; font-weight: 600;">${candidate.fit_score || 0}/100 (${fitLabel})</span></p>
        <p class="candidate-meta">Applied: ${formatDate(candidate.created_at)}</p>
      </div>
      <span class="badge ${candidate.review_status}" style="background: ${fitColor};">${candidate.review_status}</span>
    </div>
    ${/* rest of card */}
  `;
  list.appendChild(card);
});
```

---

### Phase 2D: Advanced Dashboard Tabs & Search

#### 1. Add Tab System to Dashboard

**File**: `dashboard.html` (update filters section, line ~485-515)

**Replace filters with tabs**:

```html
<div class="filters">
  <div class="tab-buttons" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
    <button class="tab-btn active" data-tab="all">All Applicants</button>
    <button class="tab-btn" data-tab="pending">Pending</button>
    <button class="tab-btn" data-tab="contacted">Contacted</button>
    <button class="tab-btn" data-tab="scheduled">Scheduled</button>
    <button class="tab-btn" data-tab="approved">Approved</button>
    <button class="tab-btn" data-tab="denied">Denied</button>
    <button class="tab-btn" data-tab="archived">Archived</button>
    <button class="tab-btn" data-tab="high-fit">High Fit (70+)</button>
    <button class="tab-btn" data-tab="needs-followup">Needs Follow-Up</button>
  </div>

  <div class="filter-row">
    <input type="text" id="filterSearch" placeholder="Search by name, email, city, Instagram...">
    <select id="filterExperience">
      <option value="all">Experience: All</option>
    </select>
    <select id="filterSource">
      <option value="all">Source: All</option>
    </select>
    <select id="filterFit">
      <option value="all">Fit: All</option>
      <option value="high">High Fit (70+)</option>
      <option value="medium">Medium Fit (40-69)</option>
      <option value="low">Low Fit (0-39)</option>
    </select>
  </div>
</div>
```

**Add CSS**:

```css
.tab-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
  color: #666;
}

.tab-btn.active {
  background: #0e6b62;
  color: white;
}

.tab-btn:hover {
  background: #e0e0e0;
}

.tab-btn.active:hover {
  background: #0a5448;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 15px;
}

.filter-row input,
.filter-row select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}
```

**Add JavaScript**:

```javascript
let activeTab = 'all';

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    activeTab = e.target.dataset.tab;
    renderCandidates();
  });
});

// Update getFilteredCandidates:
const getFilteredCandidates = () => {
  const search = document.getElementById("filterSearch").value.trim().toLowerCase();
  const experience = document.getElementById("filterExperience").value;
  const source = document.getElementById("filterSource").value;
  const fitFilter = document.getElementById("filterFit")?.value || "all";

  return state.candidates.filter((candidate) => {
    // Tab filter
    if (activeTab === 'high-fit' && (candidate.fit_score || 0) < 70) return false;
    if (activeTab === 'needs-followup' && candidate.review_status !== 'pending' && candidate.review_status !== 'contacted') return false;
    if (activeTab !== 'all' && candidate.review_status !== activeTab) return false;

    // Fit score filter
    if (fitFilter === 'high' && (candidate.fit_score || 0) < 70) return false;
    if (fitFilter === 'medium' && ((candidate.fit_score || 0) < 40 || (candidate.fit_score || 0) >= 70)) return false;
    if (fitFilter === 'low' && (candidate.fit_score || 0) >= 40) return false;

    // Text search
    const searchText = `${candidate.full_name} ${candidate.email} ${candidate.city} ${candidate.instagram || ''}`.toLowerCase();
    if (search && !searchText.includes(search)) return false;

    // Other filters
    if (experience !== 'all' && candidate.experience !== experience) return false;
    if (source !== 'all' && candidate.hear_about !== source) return false;

    return true;
  });
};
```

---

## Implementation Priority

**Week 1**: Contact buttons + Admin notes (Phase 2A) - Most useful immediately  
**Week 2**: Source tracking (Phase 2B) - Critical for marketing attribution  
**Week 3**: Fit scoring (Phase 2C) - Improves workflow efficiency  
**Week 4**: Tab system (Phase 2D) - Polish and advanced features

---

## Files to Modify

```
index.html                          (source tracking, contact buttons)
artistic-nude-survey.html          (source tracking)
dashboard.html                      (all features)
artistic-nude-dashboard.html       (all features)
api/dashboard.js                    (fit score, admin_notes save)
api/dashboard-artistic-nude.js     (fit score, admin_notes save)
```

---

## Testing Checklist

- [ ] Contact buttons open correct apps/emails
- [ ] Admin notes save and persist
- [ ] URL parameters pre-fill source field
- [ ] Fit score calculates correctly (max 100)
- [ ] Tab system filters candidates properly
- [ ] All filters work together without conflicts
- [ ] Mobile responsive (tabs stack, buttons wrap)

---

## Notes

- All contact buttons use native device handlers (mailto, tel, sms, WhatsApp)
- Admin notes are plain text fields saved to database
- Fit score is calculated on the fly (no need to store)
- Tab system is client-side only (faster, no API changes)
- Features can be deployed independently or as a batch


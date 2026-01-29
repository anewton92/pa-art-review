import React, { useState } from 'react';

// ============================================
// CONFIGURATION
// ============================================
const IS_PRODUCTION = import.meta.env.VITE_PRODUCTION_MODE === 'true';
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '/.netlify/functions/submit-review';

// ============================================
// CLOUDINARY CONFIG
// ============================================
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dejobxzdr/image/upload';

// Images with hash suffixes - map clean ID to full public ID
const IMAGE_MAP: Record<string, string> = {
  // Books as Art
  'books-1': 'books-1_isj3gk',
  'books-2': 'books-2_aykyvm',
  'books-3': 'books-3_bdkpzh',
  'books-4': 'books-4_qzy4r5',
  'books-5': 'books-5_wepd1q',
  'books-6': 'books-6_po4gs8',
  'books-7': 'books-7_kuhbug',
  'books-8': 'books-8_wbktt6',
  'books-9': 'books-9_ttzupz',
  'books-10': 'books-10_d7apgi',
  'books-11': 'books-11_rmybge',
  // Impressionist
  'impr-1': 'impr-1_mjynof',
  'impr-2': 'impr-2_vp2i1v',
  'impr-3': 'impr-3_vd3fgs',
  'impr-4': 'impr-4_zk1sad',
  'impr-5': 'impr-5_mmemaf',
  'impr-6': 'impr-6_bf74aq',
  'impr-7': 'impr-7_pzokev',
  'impr-8': 'impr-8_kmrld6',
  'impr-9': 'impr-9_iqzw00',
  'impr-10': 'impr-10_ffvd3b',
  'impr-11': 'impr-11_plopfb',
  'impr-12': 'impr-12_qo7fxn',
  'impr-13': 'impr-13_pjwwly',
  'impr-14': 'impr-14_b3lari',
  'impr-15': 'impr-15_qcohj8',
  'impr-16': 'impr-16_u5jaeo',
  'impr-17': 'impr-17_ywil9d',
  'impr-18': 'impr-18_ihmagr',
  // Surrealism
  'surr-1': 'surr-1_vt80fk',
  'surr-2': 'surr-2_ua82cw',
  'surr-3': 'surr-3_kqgqlr',
  'surr-4': 'surr-4_t0oldo',
  'surr-5': 'surr-5_quvqo4',
  'surr-6': 'surr-6_t2hb5g',
  'surr-7': 'surr-7_dvfczi',
  'surr-8': 'surr-8_lgam10',
  'surr-9': 'surr-9_dx4l5k',
  'surr-10': 'surr-10_brvjxw',
  'surr-11': 'surr-11_u8c7sw',
  'surr-12': 'surr-12_hsamor',
  'surr-13': 'surr-13_tftbxl',
  'surr-14': 'surr-14_hvr2ys',
  'surr-15': 'surr-15_aj498f',
  'surr-16': 'surr-16_afgtuf',
  'surr-17': 'surr-17_kinuq5',
  'surr-18': 'surr-18_c88b9d',
  'surr-19': 'surr-19_eiegur',
  'surr-20': 'surr-20_w5wsbh',
  'surr-21': 'surr-21_fsco2k',
  'surr-22': 'surr-22_mk4fmt',
  'surr-23': 'surr-23_zidxrd',
  'surr-24': 'surr-24_yy29vc',
  'surr-25': 'surr-25_kummql',
  'surr-26': 'surr-26_oqyxuw',
  'surr-27': 'surr-27_npcmau',
  'surr-28': 'surr-28_pujvfa',
  'surr-29': 'surr-29_objihb',
  'surr-30': 'surr-30_lflmx4',
  'surr-31': 'surr-31_niqnwq',
  'surr-32': 'surr-32_vynxa7',
  'surr-33': 'surr-33_uwhs8n',
};

// Get image URL - for images not in map, just use the ID directly
const img = (id: string) => {
  if (IMAGE_MAP[id]) {
    return `${CLOUDINARY_BASE}/${IMAGE_MAP[id]}.png`;
  }
  // Try the ID directly (for de-, free-, grid-, abs-, dim- images without hashes)
  return `${CLOUDINARY_BASE}/${id}.png`;
};

// ============================================
// PROPOSED ART CATEGORIES
// ============================================
const PROPOSED_ART_CATEGORIES = [
  {
    id: 'books-as-art',
    title: 'Books as Art',
    color: 'amber',
    description: 'Sculptural book pieces and literary-inspired artworks that honor the firm\'s intellectual heritage.',
    images: Array.from({ length: 11 }, (_, i) => `books-${i + 1}`)
  },
  {
    id: 'delaware-artists',
    title: 'Delaware Artists',
    color: 'emerald',
    description: 'Works by contemporary Delaware artists, connecting the firm to its local creative community.',
    images: Array.from({ length: 37 }, (_, i) => `de-${i + 1}`)
  },
  {
    id: 'freestanding-sculpture',
    title: 'Freestanding Sculpture',
    color: 'sky',
    description: 'Three-dimensional works for lobbies, conference areas, and circulation spaces.',
    images: Array.from({ length: 7 }, (_, i) => `free-${i + 1}`)
  },
  {
    id: 'dimensional-relief',
    title: 'Dimensional Relief',
    color: 'rose',
    description: 'Wall-mounted sculptural pieces adding depth and texture to key locations.',
    images: Array.from({ length: 32 }, (_, i) => `dim-${i + 1}`)
  },
  {
    id: 'grid-modular',
    title: 'Grid & Modular',
    color: 'violet',
    description: 'Systematic arrangements and repeating compositions for larger wall expanses.',
    images: Array.from({ length: 15 }, (_, i) => `grid-${i + 1}`)
  },
  {
    id: 'abstract-paintings',
    title: 'Abstract Paintings',
    color: 'orange',
    description: 'Contemporary abstract works in various scales for office and common areas.',
    // abs-12 is corrupted, so we use 1-11 and 13-32 (31 images total)
    images: [...Array.from({ length: 11 }, (_, i) => `abs-${i + 1}`), ...Array.from({ length: 20 }, (_, i) => `abs-${i + 13}`)]
  },
  {
    id: 'surrealism',
    title: 'Surrealism',
    color: 'indigo',
    description: 'Dream-like imagery and unexpected juxtapositions that spark curiosity and conversation.',
    images: Array.from({ length: 33 }, (_, i) => `surr-${i + 1}`)
  },
  {
    id: 'impressionist',
    title: 'Impressionist',
    color: 'teal',
    description: 'Light-filled landscapes and atmospheric scenes in the impressionist tradition.',
    images: Array.from({ length: 18 }, (_, i) => `impr-${i + 1}`)
  }
];

// ============================================
// TYPE DEFINITIONS
// ============================================
interface ResponseData {
  rating?: string;
  comment?: string;
  timestamp?: string;
}

interface ResponseMap {
  [key: string]: ResponseData;
}

interface UploadedFile {
  file: File;
  preview: string;
}

// ============================================
// SUBMISSION SERVICE
// ============================================
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

async function submitReview(
  reviewerName: string,
  reviewerEmail: string,
  responses: ResponseMap,
  additionalFeedback: string,
  uploadedFiles: UploadedFile[]
): Promise<{ success: boolean; message: string }> {
  const imageData = await Promise.all(
    uploadedFiles.map(async ({ file }) => ({
      name: file.name,
      type: file.type,
      data: await fileToBase64(file),
    }))
  );

  const payload = {
    reviewerName,
    reviewerEmail,
    responses,
    additionalFeedback,
    uploadedImages: imageData,
    submittedAt: new Date().toISOString(),
  };

  if (!IS_PRODUCTION) {
    console.log('DEV MODE - Would submit:', payload);
    return { success: true, message: 'Saved locally (dev mode)' };
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'category'>('landing');
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [responses, setResponses] = useState<ResponseMap>({});
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    try {
      const savedData = localStorage.getItem('pa-art-review-v4');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setResponses(parsed.responses || {});
        setReviewerName(parsed.reviewerName || '');
        setReviewerEmail(parsed.reviewerEmail || '');
      }
    } catch (e) {
      console.log('No saved data found');
    }
    setIsLoaded(true);
  }, []);

  React.useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('pa-art-review-v4', JSON.stringify({
          responses,
          reviewerName,
          reviewerEmail,
          lastUpdated: new Date().toISOString()
        }));
      } catch (e) {
        console.error('Failed to save:', e);
      }
    }
  }, [responses, reviewerName, reviewerEmail, isLoaded]);

  const handleRating = (imageId: string, rating: string) => {
    setResponses(prev => ({
      ...prev,
      [imageId]: { ...prev[imageId], rating, timestamp: new Date().toISOString() }
    }));
  };

  const handleComment = (imageId: string, comment: string) => {
    setResponses(prev => ({
      ...prev,
      [imageId]: { ...prev[imageId], comment, timestamp: new Date().toISOString() }
    }));
  };

  if (currentView === 'category' && activeCategory) {
    return (
      <CategoryReview
        category={activeCategory}
        responses={responses}
        handleRating={handleRating}
        handleComment={handleComment}
        reviewerName={reviewerName}
        onBack={() => setCurrentView('landing')}
      />
    );
  }

  return (
    <LandingPage
      reviewerName={reviewerName}
      setReviewerName={setReviewerName}
      reviewerEmail={reviewerEmail}
      setReviewerEmail={setReviewerEmail}
      setCurrentView={setCurrentView}
      setActiveCategory={setActiveCategory}
      responses={responses}
    />
  );
}

// ============================================
// LANDING PAGE
// ============================================
function LandingPage({ reviewerName, setReviewerName, reviewerEmail, setReviewerEmail, setCurrentView, setActiveCategory, responses }: any) {
  const [nameInput, setNameInput] = useState(reviewerName);
  const [emailInput, setEmailInput] = useState(reviewerEmail);
  const hasStarted = nameInput.trim().length > 0 && emailInput.trim().length > 0;

  const colorClasses: Record<string, { bg: string; border: string }> = {
    amber: { bg: 'bg-amber-50', border: 'border-amber-200' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200' },
    sky: { bg: 'bg-sky-50', border: 'border-sky-200' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200' },
  };

  const getProgress = (category: any) => {
    const completed = category.images.filter((id: string) => responses[id]?.rating).length;
    return { completed, total: category.images.length };
  };

  const startCategory = (category: any) => {
    if (nameInput.trim() && emailInput.trim()) {
      setReviewerName(nameInput.trim());
      setReviewerEmail(emailInput.trim());
      setActiveCategory(category);
      setCurrentView('category');
    }
  };

  const totalImages = PROPOSED_ART_CATEGORIES.reduce((sum, cat) => sum + cat.images.length, 0);
  const totalCompleted = Object.keys(responses).filter((id: string) => responses[id]?.rating).length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* PA Logo */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-stone-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">PA</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-stone-800">Potter Anderson & Corroon</h1>
                  <p className="text-stone-500 text-sm">200th Anniversary Art Collection</p>
                </div>
              </div>
            </div>
            {/* Pearhaus Logo */}
            <div className="flex items-center gap-2 text-stone-400">
              <span className="text-xs">Curated by</span>
              <span className="font-semibold text-stone-600">Pearhaus</span>
            </div>
          </div>
          {!IS_PRODUCTION && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Development Mode
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <section className="bg-white rounded-2xl border border-stone-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Welcome</h2>
          <div className="text-stone-600 space-y-4 mb-6">
            <p>
              Help us understand your preferences by reviewing proposed artwork for the firm's spaces.
              Rate each piece to indicate what resonates — we're assessing taste to inform final selections,
              not all pieces shown will be acquired.
            </p>
            <p>
              You do not need to provide feedback to all options below - feel free to just respond to only the
              art pieces you have a strong positive / negative reaction to. We will consider no response as
              neutral preference. We've also provided a comment field for each painting if you'd like to provide
              specific feedback (e.g., great for conference room, would love this in the reception area, only
              for internal spaces, etc.). But, again, that is optional.
            </p>
            <p>
              At the bottom of this form is an opportunity to provide general comments and feedback, offer
              other suggestions (artist names, links, galleries, etc.). You can also upload images as well.
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
            <input
              type="email"
              placeholder="Your email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
        </section>

        {/* Progress Overview */}
        {hasStarted && (
          <section className="bg-stone-800 text-white rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-stone-400 text-sm">Progress</div>
                <div className="text-2xl font-semibold">{totalCompleted} of {totalImages} pieces reviewed</div>
                <div className="text-stone-400 text-sm mt-1">No response = neutral preference</div>
              </div>
              <div className="text-right">
                <div className="text-stone-400 text-sm">Reviewing as</div>
                <div className="font-medium">{nameInput}</div>
                <div className="text-stone-400 text-sm">{emailInput}</div>
              </div>
            </div>
            <div className="mt-4 h-2 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${(totalCompleted / totalImages) * 100}%` }}
              />
            </div>
          </section>
        )}

        {/* Categories Grid */}
        {hasStarted && (
          <section>
            <h2 className="text-lg font-semibold text-stone-800 mb-4">Categories</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {PROPOSED_ART_CATEGORIES.map((category: any) => {
                const progress = getProgress(category);
                const colors = colorClasses[category.color as keyof typeof colorClasses];

                return (
                  <div
                    key={category.id}
                    className={`${colors.bg} ${colors.border} border rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer`}
                    onClick={() => startCategory(category)}
                  >
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">{category.title}</h3>
                    <p className="text-stone-600 text-sm mb-4 line-clamp-2">{category.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 text-sm">
                        {progress.completed} / {progress.total} reviewed
                      </span>
                      <span className="text-stone-800 font-medium text-sm">
                        Review →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Additional Feedback Section */}
        {hasStarted && (
          <section className="mt-8 pt-8 border-t border-stone-200">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">Additional Feedback</h2>
            <p className="text-stone-600 text-sm mb-6">
              Have other ideas? Share artist recommendations, reference images, websites, or general thoughts below.
            </p>

            <AdditionalFeedback
              reviewerName={nameInput}
              reviewerEmail={emailInput}
              responses={responses}
            />
          </section>
        )}

        {/* Export Button */}
        {hasStarted && (
          <section className="mt-8 pt-8 border-t border-stone-200">
            <ExportButton responses={responses} reviewerName={nameInput} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-800 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">PA</span>
            </div>
            <span className="text-stone-500 text-sm">Potter Anderson & Corroon</span>
          </div>
          <div className="text-stone-400 text-sm">
            Curated by <span className="font-medium text-stone-600">Pearhaus</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// CATEGORY REVIEW (with comment field)
// ============================================
function CategoryReview({ category, responses, handleRating, handleComment, reviewerName, onBack }: any) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const colorClasses: Record<string, { bg: string; border: string; ring: string }> = {
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-300' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-300' },
    sky: { bg: 'bg-sky-50', border: 'border-sky-200', ring: 'ring-sky-300' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-300' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', ring: 'ring-violet-300' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-300' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', ring: 'ring-indigo-300' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', ring: 'ring-teal-300' },
  };

  const colors = colorClasses[category.color as keyof typeof colorClasses];
  const completedCount = category.images.filter((id: string) => responses[id]?.rating).length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-stone-800">{category.title}</h1>
                <p className="text-stone-500 text-sm">{completedCount} of {category.images.length} reviewed (optional)</p>
              </div>
            </div>
            <div className="text-sm text-stone-500">
              Reviewing as <span className="font-medium text-stone-700">{reviewerName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Description */}
      <div className={`${colors.bg} border-b ${colors.border}`}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <p className="text-stone-600 text-sm">{category.description}</p>
        </div>
      </div>

      {/* Image Grid */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {category.images.map((imageId: string, index: number) => {
            const response = responses[imageId];

            return (
              <div
                key={imageId}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  response?.rating
                    ? response.rating === 'yes' ? 'border-green-300 ring-2 ring-green-100'
                    : response.rating === 'no' ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-stone-200 hover:shadow-md'
                }`}
              >
                {/* Image */}
                <div
                  className="aspect-square bg-stone-100 cursor-pointer relative"
                  onClick={() => setLightboxIndex(index)}
                >
                  <img
                    src={img(imageId)}
                    alt={imageId}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {response?.rating && (
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                      response.rating === 'yes' ? 'bg-green-500'
                      : response.rating === 'no' ? 'bg-red-500'
                      : 'bg-amber-500'
                    }`}>
                      {response.rating === 'yes' ? '✓' : response.rating === 'no' ? '✗' : '?'}
                    </div>
                  )}
                </div>

                {/* Rating Buttons and Comment */}
                <div className="p-3">
                  <div className="text-xs text-stone-400 mb-2">{imageId}</div>
                  <div className="flex gap-1 mb-3">
                    <button
                      onClick={() => handleRating(imageId, 'yes')}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        response?.rating === 'yes'
                          ? 'bg-green-500 text-white'
                          : 'bg-stone-100 text-stone-500 hover:bg-green-50 hover:text-green-600'
                      }`}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleRating(imageId, 'maybe')}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        response?.rating === 'maybe'
                          ? 'bg-amber-500 text-white'
                          : 'bg-stone-100 text-stone-500 hover:bg-amber-50 hover:text-amber-600'
                      }`}
                    >
                      🤔
                    </button>
                    <button
                      onClick={() => handleRating(imageId, 'no')}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        response?.rating === 'no'
                          ? 'bg-red-500 text-white'
                          : 'bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      👎
                    </button>
                  </div>
                  {/* Comment Field */}
                  <textarea
                    placeholder="Add a comment (optional)..."
                    value={response?.comment || ''}
                    onChange={(e) => handleComment(imageId, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {lightboxIndex < category.images.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={img(category.images[lightboxIndex])}
              alt={category.images[lightboxIndex]}
              className="max-h-[70vh] object-contain"
            />
            <div className="mt-4 text-center">
              <div className="text-white/60 text-sm mb-3">{category.images[lightboxIndex]}</div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleRating(category.images[lightboxIndex], 'yes')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    responses[category.images[lightboxIndex]]?.rating === 'yes'
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-white hover:bg-green-500/50'
                  }`}
                >
                  👍 Yes
                </button>
                <button
                  onClick={() => handleRating(category.images[lightboxIndex], 'maybe')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    responses[category.images[lightboxIndex]]?.rating === 'maybe'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white/10 text-white hover:bg-amber-500/50'
                  }`}
                >
                  🤔 Maybe
                </button>
                <button
                  onClick={() => handleRating(category.images[lightboxIndex], 'no')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    responses[category.images[lightboxIndex]]?.rating === 'no'
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-white hover:bg-red-500/50'
                  }`}
                >
                  👎 No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ADDITIONAL FEEDBACK
// ============================================
function AdditionalFeedback({ reviewerName, reviewerEmail, responses }: { reviewerName: string; reviewerEmail: string; responses: ResponseMap }) {
  const [feedback, setFeedback] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try {
      const savedFeedback = localStorage.getItem('pa-art-feedback-v4');
      if (savedFeedback) {
        const parsed = JSON.parse(savedFeedback);
        setFeedback(parsed.feedback || '');
      }
    } catch (e) {
      console.log('No saved feedback found');
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('pa-art-feedback-v4', JSON.stringify({
        feedback,
        reviewerName,
        reviewerEmail,
        lastUpdated: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Failed to save feedback:', e);
    }
  }, [feedback, reviewerName, reviewerEmail]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const result = await submitReview(
        reviewerName,
        reviewerEmail,
        responses,
        feedback,
        uploadedFiles
      );

      if (result.success) {
        setSubmitStatus('success');
        uploadedFiles.forEach(f => URL.revokeObjectURL(f.preview));
        setUploadedFiles([]);
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canSubmit = reviewerName.trim().length > 0 && reviewerEmail.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-medium text-stone-800 mb-2">Reference Images</h3>
        <p className="text-stone-500 text-sm mb-4">
          Upload screenshots, inspiration images, or examples of artwork you'd like us to consider.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx"
          multiple
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:border-stone-400 hover:bg-stone-50 transition-colors"
        >
          <svg className="w-8 h-8 mx-auto text-stone-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-stone-600 text-sm">Click to upload images or documents</span>
          <span className="block text-stone-400 text-xs mt-1">PNG, JPG, PDF, DOC up to 10MB each</span>
        </button>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadedFiles.map(({ file, preview }, index) => (
              <div key={index} className="flex items-center justify-between bg-stone-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={preview}
                      alt={file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-stone-200 rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-stone-700 truncate max-w-[200px]">{file.name}</div>
                    <div className="text-xs text-stone-400">{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-stone-200 rounded transition-colors"
                >
                  <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Text Feedback */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="font-medium text-stone-800 mb-2">Other Ideas & Feedback</h3>
        <p className="text-stone-500 text-sm mb-4">
          Share artist names, website URLs, general thoughts, or anything else we should consider.
        </p>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Examples:&#10;• Artist recommendation: Jane Smith (janesmithart.com)&#10;• I'd love to see more landscape photography&#10;• Check out this gallery: example.com/gallery&#10;• General thoughts on the direction..."
          className="w-full p-4 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
          rows={6}
        />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {feedback.length > 0 ? 'Auto-saved locally' : 'Your feedback is saved automatically'}
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <div className="bg-stone-800 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white mb-1">Ready to Submit?</h3>
            <p className="text-stone-400 text-sm">
              {IS_PRODUCTION
                ? 'Your responses will be sent for review.'
                : 'Development mode: data will be saved locally only.'}
            </p>
          </div>

          {submitStatus === 'success' ? (
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Submitted!</span>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                canSubmit && !isSubmitting
                  ? 'bg-white text-stone-800 hover:bg-stone-100'
                  : 'bg-stone-700 text-stone-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit Review
                </>
              )}
            </button>
          )}
        </div>

        {submitStatus === 'error' && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {errorMessage || 'Failed to submit. Please try again.'}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EXPORT BUTTON
// ============================================
function ExportButton({ responses, reviewerName }: any) {
  const exportData = () => {
    let csv = 'Category,ID,Rating,Comment,Timestamp\n';

    Object.entries(responses).forEach(([id, data]: [string, any]) => {
      let category = 'Unknown';
      if (id.startsWith('books-')) category = 'Books as Art';
      else if (id.startsWith('de-')) category = 'Delaware Artists';
      else if (id.startsWith('free-')) category = 'Freestanding Sculpture';
      else if (id.startsWith('dim-')) category = 'Dimensional Relief';
      else if (id.startsWith('grid-')) category = 'Grid & Modular';
      else if (id.startsWith('abs-')) category = 'Abstract Paintings';
      else if (id.startsWith('surr-')) category = 'Surrealism';
      else if (id.startsWith('impr-')) category = 'Impressionist';

      const comment = (data.comment || '').replace(/"/g, '""');
      csv += `"${category}","${id}","${data.rating || ''}","${comment}","${data.timestamp || ''}"\n`;
    });

    try {
      const savedFeedback = localStorage.getItem('pa-art-feedback-v4');
      if (savedFeedback) {
        const parsed = JSON.parse(savedFeedback);
        if (parsed.feedback) {
          csv += '\n"Additional Feedback","","","' + parsed.feedback.replace(/"/g, '""').replace(/\n/g, ' | ') + '","' + (parsed.lastUpdated || '') + '"\n';
        }
      }
    } catch (e) {
      // Ignore errors
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `art-review-${reviewerName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalResponses = Object.keys(responses).filter(k => responses[k]?.rating).length;

  return (
    <button
      onClick={exportData}
      disabled={totalResponses === 0}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        totalResponses > 0
          ? 'bg-stone-800 text-white hover:bg-stone-700'
          : 'bg-stone-200 text-stone-400 cursor-not-allowed'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export Responses ({totalResponses})
    </button>
  );
}

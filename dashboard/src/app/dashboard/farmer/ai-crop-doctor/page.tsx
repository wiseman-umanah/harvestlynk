export default function AICropDoctor() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Crop Doctor</h1>
        <p className="text-gray-500 mt-1">
          Upload a photo of your diseased crops for instant diagnosis and expert treatment
          recommendations powered by agricultural AI.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#e8f5e9] flex items-center justify-center mb-6">
          <i className="ri-camera-line text-[#0D631B] text-4xl" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Crop Image</h2>
        <p className="text-gray-500 text-sm max-w-xs mb-8">
          Take a clear photo of the leaves, stem, or fruit showing signs of disease.
        </p>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#0D631B] text-white font-medium hover:bg-[#0a4f15] transition-colors">
            <i className="ri-camera-line" /> Take a Photo
          </button>
          <button className="flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-[#0D631B] text-[#0D631B] font-medium hover:bg-[#e8f5e9] transition-colors">
            <i className="ri-image-add-line" /> Choose from Gallery
          </button>
        </div>
      </div>
    </div>
  );
}

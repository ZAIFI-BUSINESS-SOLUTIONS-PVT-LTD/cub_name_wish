import React from 'react';

const Landing: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Create Beautiful Teacher's Day Greetings
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              Personalize a stunning card for your favorite teacher in just a few clicks. Fast, easy, and free.
            </p>
            <button onClick={onCreate} className="btn btn-primary">
              Create Your Greeting
            </button>
          </div>
          <div className="hidden md:block">
            <div className="relative w-full h-96">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-96 bg-blue-200 rounded-2xl transform -rotate-12 transition-transform duration-500 hover:rotate-0 hover:scale-105 shadow-2xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-96 bg-white rounded-2xl transform rotate-6 transition-transform duration-500 hover:rotate-0 hover:scale-105 shadow-2xl overflow-hidden">
                <div className="p-6">
                  <div className="w-24 h-24 bg-pink-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;

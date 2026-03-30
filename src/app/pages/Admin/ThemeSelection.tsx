import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Check, Palette } from 'lucide-react';

export function ThemeSelection() {
  const { currentTheme, setTheme } = useTheme();

  const themeOptions = [
    {
      id: 'default',
      name: 'Enterprise Default',
      description: 'The standard professional Slate & Zinc interface.',
      colors: ['#030213', '#64748b', '#ffffff'],
    },
    {
      id: 'amber',
      name: 'Premium Amber',
      description: 'The high-end logistics theme with gold accents.',
      colors: ['#ca8a04', '#1e293b', '#fef3c7'],
    },
    {
      id: 'pink',
      name: 'Blossom Pink',
      description: 'A professional magenta-based theme for a vibrant look.',
      colors: ['#db2777', '#831843', '#fdf2f8'],
    },
    {
      id: 'ocean',
      name: 'Ocean Analytics',
      description: 'Deep blue tones for a high-tech data environment.',
      colors: ['#0284c7', '#0c4a6e', '#e0f2fe'],
    },
    {
      id: 'forest',
      name: 'Forest Sustainable',
      description: 'Eco-friendly emerald tones for modern logistics.',
      colors: ['#059669', '#064e3b', '#d1fae5'],
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Theme Selection</h1>
        <p className="text-slate-500 font-medium mt-1">Customize the visual identity of the RSS Logistic platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themeOptions.map((theme) => (
          <Card 
            key={theme.id} 
            className={`overflow-hidden border-2 transition-all cursor-pointer hover:shadow-lg ${currentTheme === theme.id ? 'border-primary ring-2 ring-primary/20' : 'border-slate-100'}`}
            onClick={() => setTheme(theme.id as any)}
          >
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Palette className={`h-5 w-5 ${currentTheme === theme.id ? 'text-primary' : 'text-slate-500'}`} />
                </div>
                {currentTheme === theme.id && (
                  <div className="bg-primary text-white p-1 rounded-full">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              <CardTitle className="text-xl mt-4">{theme.name}</CardTitle>
              <CardDescription>{theme.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                {theme.colors.map((color, i) => (
                  <div 
                    key={i} 
                    className="h-8 w-8 rounded-full border border-black/5 shadow-inner" 
                    style={{ backgroundColor: color }} 
                  />
                ))}
              </div>
              <Button 
                className="w-full font-bold rounded-xl" 
                variant={currentTheme === theme.id ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  setTheme(theme.id as any);
                }}
              >
                {currentTheme === theme.id ? "Active Theme" : "Apply Theme"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-slate-100 rounded-[2rem] border border-slate-200">
        <h3 className="font-bold text-slate-800">Professional Note:</h3>
        <p className="text-sm text-slate-600 mt-1">
          Theme changes are global and will be reflected immediately across the Admin and Personnel dashboards. 
          Your preference is saved locally to your browser.
        </p>
      </div>
    </div>
  );
}

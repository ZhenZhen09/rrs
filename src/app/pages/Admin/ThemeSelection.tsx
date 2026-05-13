import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Check, Palette } from 'lucide-react';
import { cn } from '../../components/ui/utils';

export function ThemeSelection() {
  const { currentTheme, setTheme } = useTheme();

  const themeOptions = [
    {
      id: 'default',
      name: 'Enterprise Default',
      description: 'Standard Slate & Zinc interface.',
      colors: ['#030213', '#64748b', '#ffffff'],
    },
    {
      id: 'amber',
      name: 'Premium Amber',
      description: 'Logistics theme with gold accents.',
      colors: ['#ca8a04', '#1e293b', '#fef3c7'],
    },
    {
      id: 'pink',
      name: 'Blossom Pink',
      description: 'Professional magenta vibrance.',
      colors: ['#db2777', '#831843', '#fdf2f8'],
    },
    {
      id: 'ocean',
      name: 'Ocean Analytics',
      description: 'Deep blue high-tech tones.',
      colors: ['#0284c7', '#0c4a6e', '#e0f2fe'],
    },
    {
      id: 'forest',
      name: 'Forest Sustainable',
      description: 'Eco-friendly emerald logistics.',
      colors: ['#059669', '#064e3b', '#d1fae5'],
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">Theme Selection</h1>
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1">Platform Visual Identity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {themeOptions.map((theme) => (
          <Card 
            key={theme.id} 
            className={cn(
              "overflow-hidden border-2 transition-all cursor-pointer hover:shadow-md",
              currentTheme === theme.id ? "border-primary ring-1 ring-primary/10" : "border-slate-100"
            )}
            onClick={() => setTheme(theme.id as any)}
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex justify-between items-start">
                <div className="p-1.5 bg-slate-50 rounded">
                  <Palette className={cn("h-3.5 w-3.5", currentTheme === theme.id ? "text-primary" : "text-slate-400")} />
                </div>
                {currentTheme === theme.id && (
                  <div className="bg-primary text-white p-0.5 rounded-full">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <CardTitle className="text-sm font-black text-slate-800 mt-2">{theme.name}</CardTitle>
              <CardDescription className="text-[10px] leading-tight mt-0.5">{theme.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex gap-1.5 mb-4 mt-1">
                {theme.colors.map((color, i) => (
                  <div 
                    key={i} 
                    className="h-5 w-5 rounded-full border border-black/5 shadow-inner" 
                    style={{ backgroundColor: color }} 
                  />
                ))}
              </div>
              <Button 
                size="sm"
                className="w-full font-black rounded-lg h-7 text-[9px] uppercase tracking-widest" 
                variant={currentTheme === theme.id ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  setTheme(theme.id as any);
                }}
              >
                {currentTheme === theme.id ? "Active" : "Apply"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-3 bg-slate-100/50 rounded-lg border border-slate-200/50">
        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Configuration Note:</h3>
        <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
          Theme modifications are global and persistent across all sessions. 
          Preferences are stored within the local environment.
        </p>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';

interface DesignPreview {
  id: string;
  html: string;
  title: string;
}

export const useDesignDetection = () => {
  const [designs, setDesigns] = useState<DesignPreview[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectDesigns = useCallback((aiResponse: string) => {
    setIsDetecting(true);
    
    // Simple detection for common design requests
    const designKeywords = [
      'landing page', 'home page', 'product page', 'portfolio', 
      'dashboard', 'login page', 'signup', 'contact page', 'about page'
    ];
    
    const hasDesignRequest = designKeywords.some(keyword => 
      aiResponse.toLowerCase().includes(keyword)
    );
    
    if (hasDesignRequest) {
      // This would integrate with your AI service to generate HTML
      // For now, returning the detected content
      setIsDetecting(false);
      return aiResponse;
    }
    
    setIsDetecting(false);
    return aiResponse;
  }, []);

  const onDesignsDetected = useCallback((detectedDesigns: DesignPreview[]) => {
    setDesigns(detectedDesigns);
  }, []);

  return {
    designs,
    isDetecting,
    detectDesigns,
    onDesignsDetected
  };
};
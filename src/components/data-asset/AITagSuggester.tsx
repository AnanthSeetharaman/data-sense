
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleSuggestTags } from '@/app/actions'; // Server Action

interface AITagSuggesterProps {
  datasetName: string;
  rawSchemaForAI: string;
  currentTags: string[];
  onAddTag: (tag: string) => void;
}

export function AITagSuggester({ datasetName, rawSchemaForAI, currentTags, onAddTag }: AITagSuggesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestedTags([]);

    const result = await handleSuggestTags({ datasetName, schema: rawSchemaForAI });

    setIsLoading(false);
    if (result.success && result.data) {
      // Filter out tags that are already present (case-insensitive)
      const newSuggestions = result.data.tags.filter(
        (suggestedTag) => !currentTags.some(
          (currentTag) => currentTag.toLowerCase() === suggestedTag.toLowerCase()
        )
      );
      setSuggestedTags(newSuggestions);
      if (newSuggestions.length === 0 && result.data.tags.length > 0) {
        toast({ title: "AI Suggestions", description: "All suggested tags are already added or no new relevant tags found." });
      } else if (newSuggestions.length === 0) {
        toast({ title: "AI Suggestions", description: "No new tags suggested by AI." });
      }
    } else {
      const errorMessage = result.error || 'Failed to get suggestions.';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "AI Suggestion Error",
        description: errorMessage,
      });
    }
  };

  const handleAddSuggestedTag = (tag: string) => {
    onAddTag(tag);
    setSuggestedTags(prev => prev.filter(t => t.toLowerCase() !== tag.toLowerCase()));
  };

  return (
    <div className="my-4 p-4 border rounded-lg bg-card shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-md font-semibold flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-accent" />
          AI Tag Suggestions
        </h4>
        <Button onClick={getSuggestions} disabled={isLoading} size="sm">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Get Suggestions
        </Button>
      </div>

      {error && (
        <div className="text-destructive text-sm p-2 bg-destructive/10 rounded-md flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2"/>
          {error}
        </div>
      )}

      {suggestedTags.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-2">Click a tag to add it:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                onClick={() => handleAddSuggestedTag(tag)}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !error && suggestedTags.length === 0 && datasetName && rawSchemaForAI && (
        <p className="text-sm text-muted-foreground italic">
          {currentTags.length > 0 && !error ? "No new suggestions, or try getting suggestions." : "Click 'Get Suggestions' to see AI-powered tags."}
        </p>
      )}
    </div>
  );
}

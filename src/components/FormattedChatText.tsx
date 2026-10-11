import React from 'react';

/**
 * Formats inline text with bold (**text**), code (`text`), and links
 */
function renderInlineText(text: string): React.ReactNode[] {
  // Regex splitting by bold (**...**), inline code (`...`), or urls
  const parts = text.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-[var(--text-main)]">
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code key={index} className="px-1.5 py-0.5 rounded-md bg-[var(--text-main)]/10 font-mono text-xs">
          {inner}
        </code>
      );
    }
    return part;
  });
}

/**
 * Lightweight, zero-dependency Markdown content renderer for Assistant Chat messages.
 * Formats:
 * - Bold headings / subheadings (**What to do next?** -> <strong>What to do next?</strong>)
 * - Bullet lists (- item or * item)
 * - Numbered steps (1. item)
 * - Paragraph breaks
 */
export function FormattedChatText({ content }: { content: string }) {
  if (!content) return null;

  // Split into lines
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-1.5 space-y-1 list-disc list-outside pl-4">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-1.5 space-y-1 list-decimal list-outside pl-4">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<div key={`spacer-${lineIdx}`} className="h-1.5" />);
      return;
    }

    // Check for bullet list item: "- " or "* " or "• "
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(renderInlineText(bulletMatch[1]));
      return;
    }

    // Check for numbered list: "1. " or "2) "
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(renderInlineText(numberedMatch[1]));
      return;
    }

    // Regular line
    flushList();
    elements.push(
      <p key={`p-${lineIdx}`} className="leading-relaxed">
        {renderInlineText(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}

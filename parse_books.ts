import { parse } from 'csv-parse/sync';
import fs from 'fs';

const csvContent = fs.readFileSync('books_import.csv', 'utf-8');

// The file is structured with categories heading the blocks.
// We need to split by the blank lines that indicate category boundaries.
const blocks = csvContent.split(/\n\s*,\s*,\s*,\s*,\s*,\s*\n/);

const processedBooks = [];
const categoryMap = new Map();

for (const block of blocks) {
  if (!block.trim()) continue;

  const lines = block.split('\n');
  const category = lines[0].replace(/,/g, '').trim();
  if (!category) continue;
  
  categoryMap.set(category, true);

  const csvBooks: any[] = parse(lines.slice(1).join('\n'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  for (const book of csvBooks) {
    if (!book.Title) continue;
    
    // Extract Imgur link from [img]...[/img] if present
    let coverImageUrl = book['Book Links'];
    const imgRegex = /\[img\](.*?)\[\/img\]/;
    const match = coverImageUrl.match(imgRegex);
    if (match) {
        coverImageUrl = match[1];
    }

    processedBooks.push({
      title: book.Title,
      author: book.Author,
      price: book.Price,
      coverImageUrl: coverImageUrl,
      synopsis: book.Synopsis,
      category: category,
      published: book.Published,
      pages: book.Pages
    });
  }
}

console.log(JSON.stringify({ books: processedBooks, categories: Array.from(categoryMap.keys()) }, null, 2));

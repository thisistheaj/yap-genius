#!/bin/bash

# Create project data/uploads directory if it doesn't exist
UPLOAD_DIR="../../../data/uploads"
mkdir -p "$UPLOAD_DIR"

# Convert all markdown files in the current directory to PDF
for file in *.md; do
    if [ -f "$file" ]; then
        # Create a more URL-friendly filename
        filename=$(echo "${file%.md}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
        output="$UPLOAD_DIR/$filename.pdf"
        echo "Converting $file to $output..."
        pandoc "$file" \
            -f markdown \
            -t pdf \
            --pdf-engine=weasyprint \
            -o "$output"
        
        # Set permissions to ensure the files are readable
        chmod 644 "$output"
        
        echo "Created: $output"
    fi
done

echo "PDFs are available at:"
ls -l "$UPLOAD_DIR"/*.pdf 
# carpenter

## Summary
Carpenter is a library for manipulating HTML table structures with JavaScript/jQuery. It facilitates splitting cells, merging cells and resizing columns.

## Usage
This library is intended to be used as a tool for building table-editing interfaces and won't do much on its own. The example HTML document shows how to use a click listener to trigger a cell merge, but the practical implications of this example are pretty limited.

The current implementation is honestly pretty clunky. It uses a lot of data attributes and relies on passing `TD` elements via jQuery objects to methods on a global carpenter object. This should be restructured at some point to behave as a jQuery plugin on the table itself.

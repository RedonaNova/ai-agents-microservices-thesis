# LaTeX build configuration
# Output directory for auxiliary files
$out_dir = 'build';

# Ensure PDF goes to build directory
$pdf_mode = 5;  # Use XeLaTeX

# Additional cleanup extensions
$clean_ext = 'synctex.gz aux log fls fdb_latexmk out toc lof lot lol nlo';

# Make sure LaTeX can find files in subdirectories
ensure_path('TEXINPUTS', './src//');
ensure_path('TEXINPUTS', './styles//');
ensure_path('TEXINPUTS', './figures//');
ensure_path('TEXINPUTS', './code//');


library(ggplot2)
library(argparse)

# Function to generate a plot of a given timepoint
plot_timepoint <- function(timepoint) {
	last_timepoint = subset(data_with_pca, time ==timepoint)
	last_timepoint$color = substr(last_timepoint$cell, start=1, stop=1)

	ggplot(last_timepoint, aes(PC2, PC3, color=color)) + 
		geom_point(size=0.8) + 
		xlim(-40, 15) + 
		ylim(-10, 15) + 
		ggsave(paste(timepoint, '.png', sep=''))
}

parser = ArgumentParser(description='Script to add additional columns to expression value file with values of principle components derived from PCA.')
parser$add_argument('input_file', help='File with binarized expression values from Tim.')
parser$add_argument('output_file', help='Output file. Original file with columns for PC2 and PC3 appended as the last two columns.')
args = parser$parse_args()

# Load data
expression_values = read.table(args$input_file, sep=',', header=TRUE)

# Separate out the gene expression values as a matrix
expression_matrix = as.matrix(expression_values[, 7:ncol(expression_values)])

# Calculate PCA coordinates and combine with original data
pca = prcomp(expression_matrix, scale. = TRUE)
expression_values = cbind(expression_values, subset(pca$x, select=c(PC2, PC3)))

# Output the data with the additional columns for principle components
write.table(expression_values, file=args$output_file, quote=FALSE, row.names=FALSE, sep=',')

# Code to generate plots for all timepoints (can then generate a GIF with bash command "convert -delay 10 -loop 0 *.png animation.gif")
# Generate plots for all timepoints
#for(timepoint in 1:max(expression_values$time)) {
#	print(timepoint)
#	plot_timepoint(timepoint)
#}
all: ImageExpressionTable.timesort.fixed.centered.binary.clustered.pca.csv

ImageExpressionTable.timesort.fixed.centered.binary.clustered.pca.csv: calculate_pca_coordinates.R ImageExpressionTable.timesort.fixed.centered.binary.clustered.csv
	Rscript $^ $@

fp-tdurham-ajh24-chiasson-ningli30 
============

## Team Members 

1. Timothy Durham tdurham@uw.edu 
2. Andrew Hill ajh24@uw.edu 
3. Melissa Chiasson chiasson@uw.edu
4. Ning Li ningli30@uw.edu

## Running Instructions

Access our visualization at
http://cse512-15s.github.io/fp-tdurham-ajh24-chiasson-ningli30/ or download this
repository and run `python -m SimpleHTTPServer 2255` and access this
from http://localhost:2255/.

We recommend using either Chrome or Opera for ideal viewing.

## _Caenorhabditis elegans_ embryo development and gene expression

* _Caenorhabditis elegans_ (_C. elegans_) is small roundworm used widely as a model organism
in genetics and genomics. Its development has been well studied; each
worm takes around 14 hours to grow from a single fertilized cell to a
hatched larvae with 558 cells. This process of embryonic development
progresses in a stereotyped pattern that follows an invariant cell
lineage; the same branches in this tree always produce the same tissues
in the hatched worm. 
* Embryonic development proceeds due to the tightly choreographed expression of several genes. These patterns of gene expression contribute to cell identity.
* Location of cells during embryogenesis is also important, as cell-cell interactions can influence gene regulation.

## Dataset
* The Expression Patterns In _C. elegans_ (EPIC – http://epic2.gs.washington.edu/Epic2) project has generated a dataset that describes the spatial orientation of every cell during _C. elegans_ embryogenesis, its developmental lineage and cell fate, and expression measurements for a set of about 227 genes. 
* These data provide an expansive view of gene expression in the _C. elegans_ embryo; however, to derive insights into gene expression patterns in different cells across time we need a tool to integrate and allow interactive exploration of the data.

## Storyboard

We sought to address this lack of resource by developing an interactive visualization that includes a 3D plot of the _C. elegans_ developing embryo, a lineage tree that is synched to the 3D plot, and plots of gene expression patterns. Users can explore the data using filters for lineage, cell type, and time point.

# Features
* Based on user selection, specific lineages and cell types can be highlighted in color.
* The user can track development in 3D and in 2D small multiple projections.
* Genes of interest can be selected from the heat map for further study.


![Figure 1](https://github.com/CSE512-15S/fp-tdurham-ajh24-chiasson-ningli30/blob/master/img/Figure1.png)


## Development Process 
For the development process, we discussed the initial data set and
storyboard idea together, then reconvened later to discuss the next set
of goals once we had the basics of the original storyboard programmed.
Significant time was spent discussing how the gene expression data should be displayed, formatting the gene expression data, and implementing the gene expression data in our visualization. Tim worked on the gene expression data formating, along with the gene expression gene report. Andrew worked on the PCA plot and small multiples. Ning worked on adding the intro.js tour of the visualization and highlighting logic. Melissa worked on the html modal dialogs, refining playback, and documentation of the code and process.


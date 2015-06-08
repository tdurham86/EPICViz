
# coding: utf-8

# In[9]:

from __future__ import division
import csv
import numpy
import scipy
import scipy.cluster.hierarchy as sch
import scipy.spatial.distance as dst
import scipy.stats as stats


# In[2]:

with open('ImageExpressionTable.lifespan.timesort.fixed.centered.csv') as csv_in:
    rows = [elt for elt in csv.reader(csv_in)]

expr = numpy.array([[float(e2) for e2 in e1[8:]] for e1 in rows[1:]])


# In[4]:

print(expr.shape)


# In[3]:

mexpr = numpy.ma.masked_array(expr, numpy.isnan(expr))
#minvals = numpy.min(mexpr, axis=0)
#mexpr += (minvals * -1)
mexpr[mexpr < 2000] = 0


# In[4]:

mexpr /= numpy.max(mexpr, axis=0)
mexpr = mexpr.filled(0)


# In[5]:

#print(numpy.min(mexpr, axis=0))
#print(numpy.max(mexpr, axis=0))
#print(numpy.median(mexpr, axis=0))


# In[6]:

mexpr[mexpr <= 0.1] = 0


# In[7]:

mexpr[mexpr > 0] = 1
mexpr = numpy.array(mexpr, dtype=int)


# In[8]:

#print(numpy.sum(mexpr))


# In[11]:

#cluster genes based on expression across time/lineage
dist = dst.pdist(mexpr.T, metric='euclidean')
Y = sch.linkage(dist)
index = sch.dendrogram(Y)['leaves']
#print(index)


# In[13]:

with open('ImageExpressionTable.lifespan.timesort.fixed.centered.binary.clustered.csv', 'w') as out:
    writer = csv.writer(out, lineterminator='\n')
    writer.writerow(rows[0][:8] + list(numpy.array(rows[0][8:])[index]))
    for idx, row in enumerate(rows[1:]):
        writer.writerow(row[:8] + list(mexpr[idx,index]))


# In[14]:
#MUST ADD PCA COLUMNS FIRST!
#with open('ImageExpressionTable.lifespan.timesort.fixed.centered.bincollapsed.clustered.csv', 'w') as out:
#    writer = csv.writer(out, lineterminator='\n')
#    writer.writerow(rows[0][:8] + ['exppattern'])
#    for idx, row in enumerate(rows[1:]):
#        writer.writerow(row[:8] + [''.join([str(elt) for elt in mexpr[idx, index]])])


import argparse
import os

lines_per_file = 20000
out_dir = 'exprTable'

parser = argparse.ArgumentParser()
parser.add_argument('csv_path')
args = parser.parse_args()

if not os.path.isdir(out_dir):
    os.makedirs(out_dir)

idx = 0
out_lines = []

def transform_line(line, spacer=''):
    '''The file has 3 PCA columns added to end of each line; move these to be 
    before the gene expression values and collapse the gene expression patterns
    into a single column.
    '''
    return ','.join(line[:6] + line[-3:] + [spacer.join(line[6:-3])])

with open(args.csv_path) as csv_in:
    header = csv_in.readline().strip().split(',')
    header = transform_line(header, spacer=' ')
    for line in csv_in:
        line = line.strip().split(',')
        out_lines.append(transform_line(line))
        if len(out_lines) == 20000:
            out_file = os.path.splitext(args.csv_path)[0] + '.expstr.{!s}.csv'.format(idx)
            with open(os.path.join(out_dir, out_file), 'w') as out:
                out.write(header + '\n')
                out.write('\n'.join(out_lines) + '\n')
            out_lines = []
            idx += 1
    else:
        out_file = os.path.splitext(args.csv_path)[0] + '.expstr.{!s}.csv'.format(idx)
        with open(os.path.join(out_dir, out_file), 'w') as out:
            out.write(header + '\n')
            out.write(''.join(out_lines) + '\n')
        out_lines = []
        idx += 1

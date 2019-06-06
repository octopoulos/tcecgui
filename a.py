import os, sys, time

stop_file = sys.argv[1]
filenames = sys.argv[3:]
prev_stat="arun"
while not os.path.exists(stop_file):
   cmd = "diff -u <(echo \"{0}\") live.json".format(prev_stat)
   print("cmd is :", cmd)
   os.system(cmd);
   time.sleep(1)

filec=`cat a.txt`
echo $filec
diff <(echo "$filec") a.txt

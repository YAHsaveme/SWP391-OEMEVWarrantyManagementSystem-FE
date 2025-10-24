import React, { useEffect, useState } from "react";
import {
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import { Edit, ElectricBolt } from "@mui/icons-material";
import axiosInstance from "../../services/axiosInstance";

export default function InventoryParts() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setParts([
        { sku: "IP14-SCR", name: "iPhone 14 Pro Screen", qty: 6, location: "A1" },
        { sku: "MB-M2-BAT", name: "MacBook Air M2 Battery", qty: 2, location: "B3" },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Inventory Parts
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>SKU</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Qty</TableCell>
            <TableCell>Location</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {parts.map((p) => (
            <TableRow key={p.sku}>
              <TableCell>{p.sku}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.qty}</TableCell>
              <TableCell>{p.location}</TableCell>
              <TableCell align="right">
                <IconButton color="primary" onClick={() => alert(`Use ${p.sku}`)}>
                  <ElectricBolt />
                </IconButton>
                <IconButton color="secondary">
                  <Edit />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
